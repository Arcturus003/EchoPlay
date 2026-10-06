const { app } = require('electron');
const { autoUpdater } = require('electron-updater');
app.whenReady().then(() => {
  autoUpdater.emit('error', new Error('test error'));
  setTimeout(() => app.quit(), 1000);
});
