const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openSettings: () => ipcRenderer.invoke("open-settings"),
  requestAccessToken: async () => await ipcRenderer.invoke("request-access-token"),
  getAccessToken: async () => await ipcRenderer.invoke("get-access-token"),
  getSpotifyInfo: async (url) => await ipcRenderer.invoke("get-spotify-info", url),
  getApiCredentials: async () => {
    return await ipcRenderer.invoke("get-api-credentials")
  },
});
