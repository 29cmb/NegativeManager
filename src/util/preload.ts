const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electron', {
  launchInstance: (id: string) => ipcRenderer.send('launch-instance', id),
  getAllProfiles: () => ipcRenderer.invoke('get-all-profiles'),
})