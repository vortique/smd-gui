const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openSettings: () => ipcRenderer.invoke("open-settings"),
  requestAccessToken: () => ipcRenderer.invoke("request-access-token"),
  getAccessToken: () => ipcRenderer.invoke("get-access-token"),
});
