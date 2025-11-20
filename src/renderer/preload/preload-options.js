const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveSettings: async (clientId, clientSecret, customTrackPath, ytDlpSearchCount) => {
    try {
      const result = await ipcRenderer.invoke(
        "save-settings",
        clientId,
        clientSecret,
        customTrackPath,
        ytDlpSearchCount,
      );
      return result;
    } catch (err) {
      console.error("Save failed:", err);
      return { success: false };
    }
  },
  getOptions: async () => {
    return await ipcRenderer.invoke("get-options");
  },
  closeSettingsWindow: () => ipcRenderer.invoke("close-settings-window"),
});
