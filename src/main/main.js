// main.js (ES Module)
import { app, BrowserWindow, ipcMain, Menu } from "electron";
import { EventEmitter } from "events";
import path from "path";
import fsPromises from "fs/promises";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { updateYtDlp, downloadSong } from "./yt-dlp/installers.js";
import {
  requestAccessToken,
  saveAccessToken,
  getAccessToken,
  getAlbumInfo,
  getArtistsTopTracks,
  getArtistsAlbumCount,
  getPlaylistTracks,
  getAlbumTracks,
  getSpotifyInfo,
} from "./spotify/spotify-api.js";

let mainWindow = null;
let optionsWindow = null;
let configPath = null;

const createWindow = async () => {
  const win = new BrowserWindow({
    width: 1350,
    height: 900,
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

const saveOptions = async (
  clientId,
  clientSecret,
  customTrackPath,
  ytDlpSearchCount
) => {
  try {
    await fsPromises.mkdir(path.dirname(configPath), { recursive: true });
    const options = {
      "client-id": clientId,
      "client-secret": clientSecret,
      "custom-track-path": customTrackPath,
      "yt-dlp-search-count": ytDlpSearchCount,
    };

    console.log(options);

    await fsPromises.writeFile(configPath, JSON.stringify(options, null, 2), {
      encoding: "utf8",
    });
    return { success: true };
  } catch (err) {
    console.error(err);
    return { success: false };
  }
};

export const getOptions = async () => {
  try {
    let jsonString = await fsPromises.readFile(configPath, {
      encoding: "utf8",
    });

    if (!jsonString.trim()) {
      jsonString = "{}";
    }

    const data = JSON.parse(jsonString);
    return data;
  } catch (err) {
    console.error("getOptions error:", err);
    return null;
  }
};

class SpotifySongDownloader extends EventEmitter {
  songDownloadStart(songName) {
    this.emit("songDownloadStart", songName);
  }

  songDownloadDone() {
    this.emit("songDownloadDone");
  }

  setDownloadStatus(message) {
    this.emit("setDownloadStatus", message);
  }

  /**
   * Ensures artist is a string
   * @param {any} artist - Artist data (can be string or array)
   * @returns {string} Artist as string
   */
  ensureArtistString(artist) {
    return typeof artist === "string" ? artist : JSON.stringify(artist);
  }

  /**
   * Gets all tracks from a playlist by ID
   * @param {string} playlistId - Spotify playlist ID
   * @returns {Promise<Object>} Object with success status and tracks array
   */
  async getPlaylistTracks(playlistId) {
    return await getPlaylistTracks(playlistId);
  }

  /**
   * Retries failed track download once
   * @param {Object} track - Track information (name and artist)
   * @returns {Promise<Object>} Download result
   */
  async retryDownload(track) {
    console.log(`[Retry] Attempting to download: ${track.name}`);
    return await this.songDownload(track);
  }

  /**
   * Downloads a single song from track information
   * @param {Object} trackInfo - Track information with name and artist
   * @returns {Promise<Object>} Success status and optional error message
   */
  async songDownload(trackInfo) {
    const artistStr = this.ensureArtistString(trackInfo.artist);
    const songQuery = `${trackInfo.name} ${artistStr}`;

    console.log("[songDownload] Query:", songQuery);
    console.log("[songDownload] Music path:", app.getPath("music"));

    this.songDownloadStart(songQuery);

    const options = await getOptions();

    if (options["custom-track-path"] !== null || options["custom-track-path"] !== "") {
      customTrackPath = options["custom-track-path"];
    } else {
      customTrackPath = app.getPath("music");
    }

    if (options["yt-dlp-search-count"] !== null) {
      ytDlpSearchCount = options["yt-dlp-search-count"];
    } else {
      ytDlpSearchCount = 3;
    }

    const downloadResult = await downloadSong(
      songQuery,
      customTrackPath,
      ytDlpSearchCount
    );

    if (downloadResult.success === true) {
      this.songDownloadDone();
      return { success: true };
    } else {
      this.songDownloadDone();
      return { success: false, message: downloadResult.message };
    }
  }

  /**
   * Downloads a single track from Spotify track info
   * @param {Object} spotifyInfo - Spotify track information
   * @returns {Promise<Object>} Success status and optional error message
   */
  async downloadTrack(spotifyInfo, count) {
    console.log(spotifyInfo);

    let downloadResult = await this.songDownload(spotifyInfo);

    if (downloadResult.success === false) {
      downloadResult = await this.retryDownload(spotifyInfo);

      if (downloadResult.success === false) {
        return { success: false, message: downloadResult.message };
      }
    }

    return { success: true };
  }

  /**
   * Downloads all tracks from a Spotify playlist
   * @param {Object} spotifyInfo - Spotify playlist information
   * @returns {Promise<Object>} Success status and optional error message
   */
  async downloadPlaylist(spotifyInfo, count) {
    if (spotifyInfo.id === null || spotifyInfo.id === "") {
      return { success: false, message: "No ID gived for playlist." };
    }

    if (spotifyInfo.totalTracks === 0) {
      return { success: false, message: "No tracks found in playlist." };
    }

    this.setDownloadStatus("Getting every track from playlist...");

    const playlistId = spotifyInfo.id;
    const playlistTracks = await this.getPlaylistTracks(playlistId);

    if (playlistTracks.success === false) {
      return { success: false, message: playlistTracks.message };
    }

    if (count === 0) {
      count = playlistTracks.result.length;
    }

    let downloadedTracks = 0;

    for (const track of playlistTracks.result) {
      let downloadResult = await this.songDownload(track);

      if (downloadResult.success === false) {
        // Try again if download failed
        downloadResult = await this.retryDownload(track);

        if (downloadResult.success === false) {
          continue;
        }
      }

      downloadedTracks++;

      if (downloadedTracks === count) {
        break;
      }
    }

    return { success: true };
  }

  /**
   * Downloads all tracks from a Spotify album
   * @param {Object} spotifyInfo - Spotify album information
   * @returns {Promise<Object>} Success status and optional error message
   */
  async downloadAlbum(spotifyInfo, count) {
    if (spotifyInfo.id === null || spotifyInfo.id === "") {
      return { success: false, message: "No ID gived for album." };
    }

    if (spotifyInfo.totalTracks === 0) {
      return { success: false, message: "No tracks found in album." };
    }

    this.setDownloadStatus("Downloading tracks from album...");

    const albumId = spotifyInfo.id;
    const albumTracks = await getAlbumTracks(albumId);

    if (albumTracks.success === false) {
      return { success: false, message: albumTracks.message };
    }

    if (count === 0) {
      count = albumTracks.result.length;
    }

    console.log(count);

    let downloadedTracks = 0;

    for (const track of albumTracks.result) {
      let downloadResult = await this.songDownload(track);

      if (downloadResult.success === false) {
        // Try again if download failed
        downloadResult = await this.retryDownload(track);

        if (downloadResult.success === false) {
          continue;
        }
      }

      downloadedTracks++;

      if (downloadedTracks === count) {
        break;
      }
    }

    return { success: true };
  }

  async downladArtistTopTracks(spotifyInfo, count) {
    if (spotifyInfo.id === null || spotifyInfo.id === "") {
      return { success: false, message: "No ID gived for artist." };
    }

    if (spotifyInfo.totalTracks === 0) {
      return {
        success: false,
        message: "No top tracks found in artists page.",
      };
    }

    this.setDownloadStatus("Getting top track from artists page...");

    const artistId = spotifyInfo.id;
    const artistTopTracks = await getArtistsTopTracks(artistId);

    if (artistTopTracks.success === false) {
      return { success: false, message: artistTopTracks.message };
    }

    if (count === 0) {
      count = artistTopTracks.result.length;
    }

    let downloadedTracks = 0;

    for (const track of artistTopTracks.result) {
      let downloadResult = await this.songDownload(track);

      if (downloadResult.success === false) {
        // Try again if download failed
        downloadResult = await this.retryDownload(track);

        if (downloadResult.success === false) {
          continue;
        }
      }

      downloadedTracks++;

      if (downloadedTracks === count) {
        break;
      }
    }

    return { success: true };
  }

  // ==================== Main Download Handler ====================

  /**
   * Main method to handle downloading from Spotify URL
   * Supports tracks, playlists, and albums
   * @param {Object} spotifyInfo - Information from Spotify API
   * @returns {Promise<Object>} Success status and optional error message
   */
  async downloadSongFromUrl(spotifyInfo, count) {
    try {
      console.log("[downloadSongFromUrl] spotifyInfo:", spotifyInfo);
      console.log("[downloadSongFromUrl] spotifyInfo.type:", spotifyInfo.type);

      // Update yt-dlp binary
      const updateResult = await updateYtDlp();

      if (updateResult.success === false) {
        return { success: false, message: "yt-dlp could not be updated." };
      }

      switch (spotifyInfo.type) {
        case "track":
          return await this.downloadTrack(spotifyInfo);

        case "playlist":
          return await this.downloadPlaylist(spotifyInfo, count);

        case "album":
          return await this.downloadAlbum(spotifyInfo, count);

        case "artist":
          return await this.downladArtistTopTracks(spotifyInfo, count);

        default:
          return {
            success: false,
            message: `Unsupported content type: ${spotifyInfo.type}`,
          };
      }
    } catch (err) {
      console.error("[downloadSongFromUrl] error:", err);
      return { success: false, message: String(err) };
    }
  }
}

app.whenReady().then(async () => {
  const downloader = new SpotifySongDownloader();

  ipcMain.handle("open-settings", () => createOptionsWindow());
  ipcMain.handle("close-settings-window", () => closeSettingsWindow());
  ipcMain.handle(
    "save-settings",
    async (_event, clientId, clientSecret, customTrackPath, ytDlpSearchCount) =>
      await saveOptions(
        clientId,
        clientSecret,
        customTrackPath,
        ytDlpSearchCount
      )
  );
  ipcMain.handle("get-options", async () => await getOptions());
  ipcMain.handle(
    "request-access-token",
    async () => await requestAccessToken()
  );
  ipcMain.handle("get-access-token", async () => await getAccessToken());
  ipcMain.handle(
    "get-spotify-info",
    async (_event, url) => await getSpotifyInfo(url)
  );
  ipcMain.handle(
    "download-song",
    async (_event, spotifyInfo, count) =>
      await downloader.downloadSongFromUrl(spotifyInfo, count)
  );

  downloader.on("songDownloadStart", (songName) => {
    mainWindow.webContents.send("songDownloadStart", songName);
  });

  downloader.on("songDownloadDone", () => {
    mainWindow.webContents.send("songDownloadDone");
  });

  downloader.on("setDownloadStatus", (message) => {
    mainWindow.webContents.send("setDownloadStatus", message);
  });

  configPath = path.join(app.getPath("userData"), "config.json");

  try {
    await fsPromises.access(configPath);
  } catch {
    const jsonString = JSON.stringify({
      "client-id": "",
      "client-secret": "",
      "custom-track-path": path.join(app.getPath("music"), "smd-gui-downloads"),
      "yt-dlp-search-count": 3,
    }, null, 2)
    
    await fsPromises.writeFile(configPath, jsonString, { encoding: "utf8" });
  }

  try {
    await fsPromises.mkdir(
      path.join(app.getPath("music"), "smd-gui-downloads"),
      { recursive: true }
    );
  } catch {
    console.log("Music downloads directory already exists.");
  }

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
