const { contextBridge, ipcRenderer, webUtils } = require('electron');
const { pathToFileURL } = require('url');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getPathForFile: (file) => {
    try {
      if (webUtils && typeof webUtils.getPathForFile === 'function') {
        return webUtils.getPathForFile(file);
      }
    } catch (e) {
      console.warn('[Preload] getPathForFile hatası:', e);
    }
    return file ? (file.path || '') : '';
  },
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
  getTransmuxStreamUrl: (filePath, audioIndex, startTime, transcodeVideo) => ipcRenderer.invoke('get-transmux-url', filePath, audioIndex, startTime, transcodeVideo),
  extractEmbeddedSubtitle: (filePath, subtitleIndex) => ipcRenderer.invoke('extract-embedded-subtitle', filePath, subtitleIndex),
  detectSpeechOnset: (filePath, startTime, duration) => ipcRenderer.invoke('detect-speech-onset', filePath, startTime, duration)
});

