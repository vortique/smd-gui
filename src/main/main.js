// main.js (ES Module)
import { app, BrowserWindow, ipcMain, Menu } from "electron";
import path from "path";
import fsPromises from "fs/promises";
import axios from "axios";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

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
    let jsonString = await fsPromises.readFile(configPath, {
      encoding: "utf8",
    });

    // Dosya boşsa "{}" olarak kabul et
    if (!jsonString.trim()) {
      jsonString = "{}";
    }

    const data = JSON.parse(jsonString);
    return data;
  } catch (err) {
    console.error("getApiCredentials hatası:", err);
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

  const data = new URLSearchParams();
  data.append("grant_type", "client_credentials");

  try {
    const response = await axios.post(url, data, { headers });

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
      return { success: false };
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
    const currentData = await fsPromises.readFile(configPath, {
      encoding: "utf8",
    });
    jsonData = JSON.parse(currentData);

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

const getAccessToken = async () => {
  try {
    const data = await fsPromises.readFile(configPath, { encoding: "utf8" });
    let jsonData = JSON.parse(data);

    const accessInfo = jsonData["access-token"];
    const accessToken = accessInfo?.["access-token"] || "";
    const expiringDate = accessInfo?.["expiring-date"];

    if (!accessToken) {
      console.log("Access token not available. Requesting new...");

      const status = await requestAccessToken();
      if (status.success) {
        const updated = await fsPromises.readFile(configPath, {
          encoding: "utf8",
        });
        const updatedJson = JSON.parse(updated);
        return updatedJson["access-token"]["access-token"];
      } else {
        return null;
      }
    }

    if (new Date(expiringDate) < new Date()) {
      console.log("Access token expired. Requesting new...");

      const status = await requestAccessToken();
      await wait(2000)
      if (status.success) {
        const updated = await fsPromises.readFile(configPath, {
          encoding: "utf8",
        });
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

const fetchUrl = (url) => {
  const fetched_url = url.substring(url.lastIndexOf("/") + 1, url.indexOf("?"));

  return fetched_url;
};

const getAlbumInfo = async (url) => {
  if (url === "" || url === null) {
    return;
  }

  try {
    const id = url.substring(url.lastIndexOf("/") + 1);

    const accessToken = await getAccessToken();

    if (accessToken === null) {
      return { type: "err" };
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const apiUrl = `https://api.spotify.com/v1/albums/${id}`;

    const response = await axios.get(apiUrl, { headers });

    if (response.status === 200) {
      let track_artists = "";

      for (const artist of response.data["artists"]) {
        track_artists += artist["name"] + ", ";
      }

      const data = {
        type: "album",
        image: response.data["images"][0]["url"] || "",
        name: response.data.name || "",
        artist: track_artists,
        releaseDate: response.data["release_date"] || "",
      };

      return data;
    } else {
      return { type: "err" };
    }
  } catch (err) {
    console.log(err);
    return { type: "err" };
  }
};

const getSpotifyInfo = async (url) => {
  if (url === "" || url === null) {
    return;
  }

  try {
    let apiUrl = "";
    const id = fetchUrl(url);

    if (url.includes("track")) {
      apiUrl = `https://api.spotify.com/v1/tracks/${id}`;

      const accessToken = await getAccessToken();

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      const response = await axios.get(apiUrl, { headers });

      if (response.status === 200) {
        let track_artists = "";

        console.log(response.data["album"]["artists"]);
        for (const artist of response.data["album"]["artists"]) {
          track_artists += artist["name"] + ", ";
        }

        const albumInfo = await getAlbumInfo(
          response.data["album"]["external_urls"]["spotify"] || ""
        );

        const data = {
          type: "track",
          image: response.data["album"]["images"][0]["url"] || "",
          name: response.data["album"]["name"] || "No name",
          artist: track_artists,
          album: albumInfo.name,
          duration: response.data["duration_ms"] / 60000,
          releaseDate: response.data["album"]["release_date"] || "No release date",
        };

        return data;
      } else {
        return { type: "err" };
      }
    } else if (url.includes("artist")) {
      apiUrl = `https://api.spotify.com/v1/artists/${id}`;
    } else if (url.includes("playlist")) {
      apiUrl = `https://api.spotify.com/v1/playlists/${id}`;

      const accessToken = await getAccessToken();

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      const response = await axios.get(apiUrl, { headers });

      if (response.status === 200) {
        let tracks = [];

        for (const trackInfos of response.data["tracks"]["items"]) {
          if (tracks.length === 20) {
            if (response.data["tracks"]["items"].length > tracks.length) {
              tracks.push({ name: "There is more...", artist: "SMD-GUI" });
            }
            break;
          }

          const track = trackInfos["track"]["album"];

          let track_artists = "";

          for (const artist of track["artists"]) {
            track_artists += artist["name"] + ", ";
          }

          const trackData = {
            name: track["name"],
            artist: track_artists,
          };

          tracks.push(trackData);
        }

        const data = {
          type: "playlist",
          image: response.data["images"][0]["url"] || "",
          name: response.data["name"] || "No name",
          owner: response.data["owner"]["display_name"] || "No owner",
          totalTracks: response.data["tracks"]["total"] || 0,
          description: response.data["description"] || "No description",
          tracks: tracks,
        };

        return data;
      } else {
        return { type: "err" };
      }
    } else if (url.includes("album")) {
    } else {
      return { type: "err" };
    }
  } catch (err) {
    console.log(err);
    return { type: "err" };
  }
};

app.whenReady().then(async () => {
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
  ipcMain.handle("get-access-token", async () => await getAccessToken());
  ipcMain.handle(
    "get-spotify-info",
    async (_event, url) => await getSpotifyInfo(url)
  );

  configPath = path.join(app.getPath("userData"), "config.json");

  try {
    await fsPromises.access(configPath);
  } catch {
    await fsPromises.writeFile(configPath, "", { encoding: "utf8" });
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
