const { app } = require('electron');
const { autoUpdater } = require('electron-updater');

app.whenReady().then(() => {
  autoUpdater.forceDevUpdateConfig = true;
  const p = autoUpdater.checkForUpdates();
  
  autoUpdater.on('error', (err) => {
    console.log('Got error event:', err.message);
  });
  
  p.catch(err => {
    console.log('Caught promise:', err.message);
  });

  setTimeout(() => app.quit(), 2000);
});
