const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// GPU Donanım Hızlandırması ve Video Çözücü Desteği (H.264, HEVC / H.265 vb.)
app.commandLine.appendSwitch('enable-features', 'PlatformHEVCDecoderSupport');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');

// Tekil Çalışma Kilidi (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  let mainWindow;

  function extractVideoPath(args) {
    if (!args || !Array.isArray(args)) return null;
    for (let i = 1; i < args.length; i++) {
      const arg = args[i];
      if (arg && !arg.startsWith('-')) {
        let parsedPath = arg.toLowerCase().split('?')[0];
        if (parsedPath.endsWith('.mp4') || parsedPath.endsWith('.mkv') || parsedPath.endsWith('.webm') || parsedPath.endsWith('.m3u8')) {
          return arg;
        }
      }
    }
    return null;
  }

  app.on('second-instance', (event, commandLine) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
      const filePath = extractVideoPath(commandLine);
      if (filePath) {
        mainWindow.webContents.send('open-external-file', filePath);
      }
    }
  });

  function createWindow () {
    mainWindow = new BrowserWindow({
      width: 1280, height: 720,
      title: 'EchoPlay',
      icon: path.join(__dirname, 'icon.png'),
      backgroundColor: '#0f0f13',
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        nodeIntegration: false,
        contextIsolation: true,
        webSecurity: true
      }
    });
    mainWindow.setMenuBarVisibility(false);
    
    mainWindow.webContents.on('did-finish-load', () => {
      const filePath = extractVideoPath(process.argv);
      if (filePath) {
        mainWindow.webContents.send('open-external-file', filePath);
      }
    });

    mainWindow.loadFile('index.html');
  }

  // Yerel m3u8 dosyalarını okuma ve göreceli yolları güvenle mutlak file:// yollarına çevirme
  ipcMain.handle('read-local-m3u8', async (event, filePath) => {
    try {
      if (!fs.existsSync(filePath)) return null;
      const content = fs.readFileSync(filePath, 'utf8');
      const dir = path.dirname(filePath);
      const fixedContent = content.split('\n').map(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('http') && !trimmed.startsWith('file:')) {
          return pathToFileURL(path.join(dir, trimmed)).href;
        }
        return line;
      }).join('\n');
      return 'data:application/vnd.apple.mpegurl;base64,' + Buffer.from(fixedContent).toString('base64');
    } catch (err) {
      console.error('[EchoPlay] Local M3U8 okuma hatası:', err);
      return null;
    }
  });

  let isMini = false;
  let oldBounds = null;
  ipcMain.on('toggle-pip', () => {
    if (!mainWindow) return;
    if (isMini) {
      if (oldBounds) mainWindow.setBounds(oldBounds);
      mainWindow.setAlwaysOnTop(false);
      isMini = false;
    } else {
      oldBounds = mainWindow.getBounds();
      mainWindow.setBounds({ width: 480, height: 270 });
      mainWindow.setAlwaysOnTop(true);
      isMini = true;
    }
  });

  app.whenReady().then(() => {
    createWindow();

    autoUpdater.autoDownload = false;

    autoUpdater.on('error', (err) => {
      console.error('Update error:', err);
    });

    autoUpdater.on('update-available', (info) => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Available',
        message: `A new version is available. Do you want to download it now?`,
        buttons: ['Yes', 'No']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.downloadUpdate().catch(err => {
            console.error('Error downloading update:', err);
          });
        }
      });
    });

    autoUpdater.on('update-downloaded', (info) => {
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'Update downloaded. Do you want to restart and install now?',
        buttons: ['Restart', 'Later']
      }).then((result) => {
        if (result.response === 0) {
          autoUpdater.quitAndInstall();
        }
      });
    });

    autoUpdater.checkForUpdates().catch(err => {
      console.error('Error checking for updates:', err);
    });
  });

  app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
  });
}
