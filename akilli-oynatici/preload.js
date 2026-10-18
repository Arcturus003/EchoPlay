const { contextBridge, ipcRenderer } = require('electron');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  togglePiP: () => ipcRenderer.send('toggle-pip'),
  onOpenExternalFile: (callback) => {
    ipcRenderer.on('open-external-file', (_event, filePath) => callback(filePath));
  },
  toFileUrl: (filePath) => {
    try {
      return pathToFileURL(filePath).href;
    } catch (e) {
      return 'file:///' + filePath.replace(/\\/g, '/');
    }
  },
  readLocalM3u8: (filePath) => ipcRenderer.invoke('read-local-m3u8', filePath),
  probeMedia: (filePath) => ipcRenderer.invoke('probe-media', filePath),
  getTransmuxStreamUrl: (filePath, audioIndex, startTime) => ipcRenderer.invoke('get-transmux-url', filePath, audioIndex, startTime),
  extractEmbeddedSubtitle: (filePath, subtitleIndex) => ipcRenderer.invoke('extract-embedded-subtitle', filePath, subtitleIndex)
});
