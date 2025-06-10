const { contextBridge, ipcRenderer } = require('electron/renderer')

contextBridge.exposeInMainWorld('electron', {
  launchInstance: (id: string) => ipcRenderer.send('launch-instance', id),
  killInstance: (id: string) => ipcRenderer.send('kill-instance', id),
  getAllProfiles: () => ipcRenderer.invoke('get-all-profiles'),
  getProfileInfo: (id: string) => ipcRenderer.invoke('get-profile-info', id),
  getProfile: (id: string) => ipcRenderer.invoke("get-profile", id),
  isInstanceActive: (id: string) => ipcRenderer.invoke("is-instance-running", id),
  deleteMod: (instance: string, mod: string) => ipcRenderer.send("delete-mod", instance, mod),
  onLogEvent: (callback: (data: any) => void) => ipcRenderer.on("logging-message", (event: any, data: any) => callback(data)),
  getConfigurationTextPlaceholder: (field: string) => ipcRenderer.invoke("get-conf-text-placeholder", field),
  validatePathType: (path: string, type: string) => ipcRenderer.invoke("validate-path-type", path, type),
  checkPathValidations: () => ipcRenderer.invoke("validate-config-paths"),
  updateConfigField: (key: string, value: string) => ipcRenderer.send('update-config-field', key, value)
})