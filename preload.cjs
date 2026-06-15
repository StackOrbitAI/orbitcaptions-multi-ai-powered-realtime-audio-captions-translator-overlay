const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.send('close-app'),
  getDesktopSourceId: () => ipcRenderer.invoke('get-desktop-source-id'),
  saveFile: (content, filename) => ipcRenderer.invoke('save-file', { content, filename }),
  saveFileSilent: (content, filename) => ipcRenderer.invoke('save-file-silent', { content, filename }),
  setAlwaysOnTop: (flag) => ipcRenderer.send('set-always-on-top', flag),
  resizeWindow: (width, height) => ipcRenderer.send('resize-window', { width, height }),
  copyToClipboard: (text) => ipcRenderer.invoke('copy-to-clipboard', text)
});
