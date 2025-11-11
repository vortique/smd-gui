const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const fsPromises = require("fs").promises;
const axios = require('axios');

let mainWindow = null;
let optionsWindow = null;
let configPath = null;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 1150,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload-main.js"),
    },
  });

  win.loadFile("index.html");

  mainWindow = win;
};

const createOptionsWindow = () => {
  const optWin = new BrowserWindow({
    width: 500,
    height: 900,
    parent: mainWindow,
    modal: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload-options.js"),
    },
  });

  optWin.loadFile("options-index.html");

  optionsWindow = optWin;
};

const closeSettingsWindow = () => {
  optionsWindow.close();
};

const saveOptions = async (clientId, clientSecret) => {
  try {
    await fsPromises.mkdir(path.dirname(configPath), { recursive: true });
    const apiKeys = { "client-id": clientId, "client-secret": clientSecret };
    await fsPromises.writeFile(configPath, JSON.stringify(apiKeys, null, 2), { encoding: "utf8" });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false };
  }
};

const getApiCredentials = async () => {
  try {
    const jsonString = await fsPromises.readFile(configPath, { encoding: "utf8" });
    return JSON.parse(jsonString);
  }
  catch (err) {
    console.error(err);
    return null;
  }
}

// TODO : Access token alan kodu yaz axios ile async olsun amk

app.whenReady().then(() => {
  ipcMain.handle("open-settings", () => createOptionsWindow());
  ipcMain.handle("close-settings-window", () => closeSettingsWindow());
  ipcMain.handle("save-settings", async (_event, clientId, clientSecret) => {
    const result = await saveOptions(clientId, clientSecret);
    return result;
  });
  ipcMain.handle("get-api-credentials", async () => {
    const data = await getApiCredentials();
    return data;
  })

  configPath = path.join(app.getPath("userData"), "config.json");

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
