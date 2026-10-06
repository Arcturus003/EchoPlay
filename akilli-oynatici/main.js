const { app, BrowserWindow, ipcMain } = require('electron');
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

app.whenReady().then(() => { createWindow(); });
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
