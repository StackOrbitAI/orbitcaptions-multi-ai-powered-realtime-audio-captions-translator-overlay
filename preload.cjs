const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  closeApp: () => ipcRenderer.send('close-app'),
  getDesktopSourceId: () => ipcRenderer.invoke('get-desktop-source-id')
});
