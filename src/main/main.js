const { app, BrowserWindow, ipcMain, Menu } = require("electron");
const path = require("path");
const fsPromises = require("fs").promises;
const axios = require("axios");

let mainWindow = null;
let optionsWindow = null;
let configPath = null;

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1150,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "../renderer/preload/preload-main.js"),
    },
  });

  await fsPromises.writeFile(configPath, "", { encoding: "utf8" });

  win.loadFile(path.join(__dirname, "../html/index.html"));

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
      preload: path.join(__dirname, "../renderer/preload/preload-options.js"),
    },
  });

  optWin.loadFile(path.join(__dirname, "../html/options-index.html"));

  optionsWindow = optWin;
};

const closeSettingsWindow = () => {
  optionsWindow.close();
};

const saveOptions = async (clientId, clientSecret) => {
  try {
    await fsPromises.mkdir(path.dirname(configPath), { recursive: true });
    const apiKeys = { "client-id": clientId, "client-secret": clientSecret };
    await fsPromises.writeFile(configPath, JSON.stringify(apiKeys, null, 2), {
      encoding: "utf8",
    });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false };
  }
};

const getApiCredentials = async () => {
  try {
    const jsonString = await fsPromises.readFile(configPath, {
      encoding: "utf8",
    });
    return JSON.parse(jsonString);
  } catch (err) {
    console.error(err);
    return null;
  }
};

const requestAccessToken = async () => {
  const credentials = await getApiCredentials();
  const url = "https://accounts.spotify.com/api/token";

  const authStr = `${credentials["client-id"]}:${credentials["client-secret"]}`;

  const b64AuthStr = Buffer.from(authStr, "utf8").toString("base64");

  const headers = {
    "content-type": "application/x-www-form-urlencoded",
    Authorization: `Basic ${b64AuthStr}`,
  };
  const data = { grant_type: "client_secrets" };

  try {
    const response = await axios.post(url, data, { headers: headers });

    if (response.status === 200) {
      const expiringDate = new Date(
        Date.now() + 1 * 60 * 60 * 1000
      ).toISOString();

      const accessToken = response.data["access_token"];

      const result = await saveAccessToken(accessToken, expiringDate);

      if (result.success !== true) {
        console.log(result);
        return result;
      }
    } else {
      return null;
    }
  } catch (err) {
    console.log(err);
    return { success: false };
  }
};

const saveAccessToken = async (accessToken, expiringDate) => {
  try {
    await fsPromises.mkdir(path.dirname(configPath), { recursive: true });

    let jsonData = {};
    try {
      const currentData = await fsPromises.readFile(configPath, {
        encoding: "utf8",
      });
      jsonData = JSON.parse(currentData);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }

    jsonData["access-token"] = {
      "access-token": accessToken,
      "expiring-date": expiringDate,
    };

    await fsPromises.writeFile(configPath, JSON.stringify(jsonData, null, 2), {
      encoding: "utf8",
    });

    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false };
  }
};

export const getAccessToken = async () => {
  try {
    const data = await fs.readFile(configPath, { encoding: "utf8" });
    let jsonData = JSON.parse(data);

    const accessInfo = jsonData["access-token"];
    const accessToken = accessInfo?.["access-token"] || "";
    const expiringDate = accessInfo?.["expiring-date"];

    if (!accessToken) {
      console.log("Access token not available. Requesting new...");

      const status = await requestAccessToken();
      if (status.success) {
        const updated = await fs.readFile(configPath, { encoding: "utf8" });
        const updatedJson = JSON.parse(updated);
        return updatedJson["access-token"]["access-token"];
      } else {
        return null;
      }
    }

    if (new Date(expiringDate) < new Date()) {
      console.log("Access token expired. Requesting new...");

      const status = await requestAccessToken();
      if (status.success) {
        const updated = await fs.readFile(configPath, { encoding: "utf8" });
        const updatedJson = JSON.parse(updated);
        return updatedJson["access-token"]["access-token"];
      } else {
        return null;
      }
    }

    console.log("Access token available.");
    return accessToken;
  } catch (err) {
    console.error("getAccessToken hatası:", err);
    return null;
  }
};

const getSpotifyInfo = async (id) => {
  try {
    
  }
}

app.whenReady().then(() => {
  ipcMain.handle("open-settings", () => createOptionsWindow());
  ipcMain.handle("close-settings-window", () => closeSettingsWindow());
  ipcMain.handle(
    "save-settings",
    async (_event, clientId, clientSecret) =>
      await saveOptions(clientId, clientSecret)
  );
  ipcMain.handle("get-api-credentials", async () => await getApiCredentials());
  ipcMain.handle(
    "request-access-token",
    async () => await requestAccessToken()
  );
  ipcMain.handle("get-access-token", async () => await getAccessToken())

  configPath = path.join(app.getPath("userData"), "config.json");

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
