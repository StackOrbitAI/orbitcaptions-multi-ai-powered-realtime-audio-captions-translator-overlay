const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.send('close-app'),
  getDesktopSourceId: () => ipcRenderer.invoke('get-desktop-source-id'),
  saveFile: (content, filename) => ipcRenderer.invoke('save-file', { content, filename }),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text)
});
