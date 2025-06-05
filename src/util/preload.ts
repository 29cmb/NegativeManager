const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electron', {
  launchInstance: (id: string) => ipcRenderer.send('launch-instance', id),
  killInstance: (id: string) => ipcRenderer.send('kill-instance', id),
  getAllProfiles: () => ipcRenderer.invoke('get-all-profiles'),
  getProfile: (id: string) => ipcRenderer.invoke("get-profile", id),
  isInstanceActive: (id: string) => ipcRenderer.invoke("is-instance-running", id)
})