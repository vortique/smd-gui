const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  saveSettings: async (clientId, clientSecret) => {
    try {
      const result = await ipcRenderer.invoke("save-settings", clientId, clientSecret);
      return result;
    } catch (err) {
      console.error("Save failed:", err);
      return { success: false };
    }
  },
  getApiCredentials: async () => {
    return await ipcRenderer.invoke("get-api-credentials")
  },
  closeSettingsWindow: () => ipcRenderer.invoke("close-settings-window"),
});
