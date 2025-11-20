const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  openSettings: () => ipcRenderer.invoke("open-settings"),
  requestAccessToken: async () =>
    await ipcRenderer.invoke("request-access-token"),
  getAccessToken: async () => await ipcRenderer.invoke("get-access-token"),
  getSpotifyInfo: async (url) =>
    await ipcRenderer.invoke("get-spotify-info", url),
  getOptions: async () => await ipcRenderer.invoke("get-options"),
  downloadSong: async (spotifyInfo, count) =>
    await ipcRenderer.invoke("download-song", spotifyInfo, count),
  onSongStart: (callback) =>
    ipcRenderer.on("songDownloadStart", (_, name) => callback(name)),
  onSongDone: (callback) => ipcRenderer.on("songDownloadDone", callback),
  onDownloadStatusChanged: (callback) =>
    ipcRenderer.on("setDownloadStatus", (_, message) => callback(message)),
});
