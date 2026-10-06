const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
app.disableHardwareAcceleration();

let mainWindow;
function createWindow () {
  mainWindow = new BrowserWindow({
    width: 1280, height: 720,
    title: 'EchoPlay',
    icon: path.join(__dirname, 'icon.png'),
    backgroundColor: '#0f0f13',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });
  mainWindow.setMenuBarVisibility(false);
  
  mainWindow.webContents.on('did-finish-load', () => {
    const args = process.argv;
    let filePath = null;
    for (let i = 1; i < args.length; i++) {
        const arg = args[i];
        if (arg && !arg.startsWith('-')) {
            let parsedPath = arg.toLowerCase();
            try {
                parsedPath = new URL(arg).pathname.toLowerCase();
            } catch(e) {
                parsedPath = arg.split('?')[0].toLowerCase();
            }

            if (parsedPath.endsWith('.mp4') || parsedPath.endsWith('.mkv') || parsedPath.endsWith('.webm') || parsedPath.endsWith('.m3u8')) {
                filePath = arg;
                break;
            }
        }
    }
    if (filePath) {
        mainWindow.webContents.send('open-external-file', filePath);
    }
  });

  mainWindow.loadFile('index.html');
}

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
app.on('window-all-closed', function () { if (process.platform !== 'darwin') app.quit() });

let isMini = false;
let oldBounds = null;
ipcMain.on('toggle-pip', () => {
  if (!mainWindow) return;
  if (isMini) {
    mainWindow.setBounds(oldBounds);
    mainWindow.setAlwaysOnTop(false);
    isMini = false;
  } else {
    oldBounds = mainWindow.getBounds();
    mainWindow.setBounds({ width: 480, height: 270 });
    mainWindow.setAlwaysOnTop(true);
    isMini = true;
  }
});
