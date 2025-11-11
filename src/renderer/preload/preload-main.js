const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openSettings: () => ipcRenderer.invoke("open-settings"),
});
