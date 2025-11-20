// spotify-api.js (ES Module)
import { app } from "electron";
import fsPromises from "fs/promises";
import axios from "axios";
import path from "path";

import { getOptions } from "../main.js";

let configPath = path.join(app.getPath("userData"), "config.json");

const wait = (ms) => new Promise((res) => setTimeout(res, ms));

/**
 * Fetches Spotify ID from URL
 * @param {string} url - Spotify URL
 * @returns {string} Extracted Spotify ID
 */
const fetchUrl = (url) => {
  const fetched_url = url.substring(url.lastIndexOf("/") + 1, url.indexOf("?"));
  return fetched_url;
};

/**
 * Requests a new access token from Spotify
 * @returns {Promise<Object>} Object with success status
 */
export const requestAccessToken = async () => {
  const credentials = await getOptions();
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

/**
 * Saves access token to config file
 * @param {string} accessToken - The access token
 * @param {string} expiringDate - The expiration date
 * @returns {Promise<Object>} Object with success status
 */
export const saveAccessToken = async (accessToken, expiringDate) => {
  try {
    // Ensure we have a valid directory to create
    const dir =
      configPath && configPath !== ""
        ? path.dirname(configPath)
        : app.getPath("userData");
    await fsPromises.mkdir(dir, { recursive: true });

    let jsonData = {};
    let currentData = "";

    try {
      currentData = await fsPromises.readFile(configPath, { encoding: "utf8" });
    } catch (err) {
      currentData = "";
    }

    if (!currentData || !currentData.trim()) {
      jsonData = {};
    } else {
      try {
        jsonData = JSON.parse(currentData);
      } catch (err) {
        jsonData = {};
      }
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

/**
 * Gets current access token from config, requests new one if expired
 * @returns {Promise<string|null>} Access token or null if error
 */
export const getAccessToken = async () => {
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
      await wait(2000);
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
    console.error("getAccessToken error:", err);
    return null;
  }
};

/**
 * Gets album information from Spotify API
 * @param {string} url - Album URL from Spotify
 * @returns {Promise<Object>} Album data or error object
 */
export const getAlbumInfo = async (url) => {
  if (url === "" || url === null) {
    return { type: "err" };
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

/**
 * Gets top tracks of an artist
 * @param {string} id - Artist ID
 * @returns {Promise<object>} Array of top tracks
 */
export const getArtistsTopTracks = async (id) => {
  if (id === "" || id === null) {
    return { success: false, message: "No id for artist." };
  }

  try {
    const apiUrl = `https://api.spotify.com/v1/artists/${id}/top-tracks`;

    const accessToken = await getAccessToken();

    if (accessToken === null) {
      return { success: false, message: "Can not get access token" };
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await axios.get(apiUrl, { headers });

    if (response.status === 200) {
      let tracks = [];

      for (const trackInfos of response.data["tracks"]) {
        const track = trackInfos["album"];

        let track_artists = "";

        if (track["artists"].length >= 1) {
          for (const artist of track["artists"]) {
            track_artists += artist["name"] + ", ";
          }
        }

        track_artists = track_artists.substring(
          0,
          track_artists.lastIndexOf(", ")
        );

        const trackData = {
          name: track["name"],
          artist: track_artists === "" ? "Single" : track_artists,
        };

        tracks.push(trackData);
      }

      return { success: true, result: tracks };
    }
  } catch (err) {
    console.log("[getArtistsTopTracks] error: " + err);
    return { success: false, message: String(err) };
  }
};

/**
 * Gets total album count for an artist (Deprecated)
 * @param {string} id - Artist ID
 * @returns {Promise<number>} Total album count
 */
export const getArtistsAlbumCount = async (id) => {
  if (id === "" || id === null) {
    return 0;
  }

  try {
    const apiUrl = `https://api.spotify.com/v1/artists/${id}/albums`;

    const accessToken = await getAccessToken();

    if (accessToken === null) {
      return 0;
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    const response = await axios.get(apiUrl, { headers });

    if (response.status === 200) {
      return response.data["total"];
    }
  } catch (err) {
    console.log(err);
    return 0;
  }
};

/**
 * Gets all tracks from a playlist
 * @param {string} id - Playlist ID
 * @returns {Promise<Object>} Object with success status and tracks array
 */
export const getPlaylistTracks = async (id) => {
  if (id === "" || id === null) {
    return { success: false, message: "No id for playlist." };
  }

  try {
    const fields =
      "fields=next%2Citems%28track%28album%28name%2Cartists%29%29%29";
    let url = `https://api.spotify.com/v1/playlists/${id}/tracks?limit=100&offset=0`;

    const accessToken = await getAccessToken();

    if (accessToken === null) {
      return { success: false, message: "Can not get access token." };
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    let tracks = [];

    while (url !== null) {
      url = `${url}&${fields}`;

      console.log(url);

      const response = await axios.get(url, { headers });

      if (response.status === 200) {
        for (const trackInfo of response.data["items"]) {
          const track = trackInfo["track"]["album"];

          let track_artists = "";

          for (const artist of track["artists"]) {
            track_artists += artist["name"] + ", ";
          }

          track_artists = track_artists.substring(
            0,
            track_artists.lastIndexOf(", ")
          );

          const trackData = {
            name: track["name"],
            artist: track_artists,
          };

          tracks.push(trackData);
        }

        url = response.data["next"];
      }
    }

    return { success: true, result: tracks };
  } catch (err) {
    console.error("[getPlaylistTracks] error: " + err);
    return { success: false, message: String(err) };
  }
};

export const getAlbumTracks = async (id) => {
  if (id === "" || id === null) {
    return { success: false, message: "No id for playlist." };
  }

  try {
    let url = `https://api.spotify.com/v1/albums/${id}/tracks?limit=50&offset=0`;

    const accessToken = await getAccessToken();

    if (accessToken === null) {
      return { success: false, message: "Can not get access token." };
    }

    const headers = {
      Authorization: `Bearer ${accessToken}`,
    };

    let tracks = [];

    while (url !== null) {
      console.log(url);

      const response = await axios.get(url, { headers });

      if (response.status === 200) {
        for (const trackInfo of response.data["items"]) {
          let track_artists = "";

          for (const artist of trackInfo["artists"]) {
            track_artists += artist["name"] + ", ";
          }

          track_artists = track_artists.substring(
            0,
            track_artists.lastIndexOf(", ")
          );

          const trackData = {
            name: trackInfo["name"],
            artist: track_artists,
          };

          tracks.push(trackData);
        }

        url = response.data["next"];
      }
    }

    return { success: true, result: tracks };
  } catch (err) {
    console.error("[getAlbumTracks] error: " + err);
    return { success: false, message: String(err) };
  }
};

/**
 * Gets information about Spotify content (track, artist, playlist, or album)
 * @param {string} url - Spotify URL
 * @returns {Promise<Object>} Spotify content information or error object
 */
export const getSpotifyInfo = async (url) => {
  if (url === "" || url === null) {
    return { type: "err" };
  }

  try {
    let apiUrl = "";
    const id = fetchUrl(url);

    if (url.includes("track")) {
      apiUrl = `https://api.spotify.com/v1/tracks/${id}`;

      const accessToken = await getAccessToken();

      if (accessToken === null) {
        return { type: "err", message: `Can not get access token` };
      }

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

        track_artists = track_artists.substring(
          0,
          track_artists.lastIndexOf(", ")
        );

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
          releaseDate:
            response.data["album"]["release_date"] || "No release date",
        };

        return data;
      } else {
        return { type: "err" };
      }
    } else if (url.includes("artist")) {
      apiUrl = `https://api.spotify.com/v1/artists/${id}`;

      const accessToken = await getAccessToken();

      if (accessToken === null) {
        return { type: "err", message: `Can not get access token` };
      }

      const headers = {
        Authorization: `Bearer ${accessToken}`,
      };

      const response = await axios.get(apiUrl, { headers });

      if (response.status === 200) {
        const artistName = response["name"];
        const topTracksResp = await getArtistsTopTracks(id, artistName);

        if (topTracksResp.success === false) {
          return { success: false, message: topTracksResp.message };
        }

        const data = {
          type: "artist",
          id: id,
          image: response.data["images"][0]["url"] || "",
          name: artistName || "No name",
          followers: response.data["followers"]["total"],
          popularity: response.data["popularity"],
          genres: response.data["genres"],
          topTracks: topTracksResp.result,
        };

        return data;
      } else {
        return { type: "err", message: `Status Error ${response.status}` };
      }
    } else if (url.includes("playlist")) {
      apiUrl = `https://api.spotify.com/v1/playlists/${id}`;

      const accessToken = await getAccessToken();

      if (accessToken === null) {
        return { type: "err", message: `Can not get access token` };
      }

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

          track_artists = track_artists.substring(
            0,
            track_artists.lastIndexOf(", ")
          );

          const trackData = {
            name: track["name"],
            artist: track_artists,
          };

          tracks.push(trackData);
        }

        const data = {
          type: "playlist",
          id: id,
          image: response.data["images"][0]["url"] || "",
          name: response.data["name"] || "No name",
          owner: response.data["owner"]["display_name"] || "No owner",
          totalTracks: response.data["tracks"]["total"] || 0,
          description: response.data["description"] || "No description",
          tracks: tracks,
        };

        return data;
      } else {
        return { type: "err", message: `Status Error ${response.status}` };
      }
    } else if (url.includes("album")) {
      apiUrl = `https://api.spotify.com/v1/albums/${id}`;

      const accessToken = await getAccessToken();

      if (accessToken === null) {
        return { type: "err", message: `Can not get access token` };
      }

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

          let track_artists = "";

          for (const artist of trackInfos["artists"]) {
            track_artists += artist["name"] + ", ";
          }

          track_artists = track_artists.substring(
            0,
            track_artists.lastIndexOf(", ")
          );

          const trackData = {
            name: trackInfos["name"],
            artist: track_artists,
          };

          tracks.push(trackData);
        }

        let album_artists = "";
        for (const artist of response.data["artists"]) {
          album_artists += artist["name"] + ", ";
        }

        const data = {
          type: "album",
          id: id,
          image: response.data["images"][0]["url"] || "",
          name: response.data["name"] || "No name",
          artist: album_artists || "No artist",
          releaseDate: response.data["release_date"] || "No release date",
          totalTracks: response.data["total_tracks"] || 0,
          tracks: tracks,
        };

        return data;
      } else {
        return { type: "err" };
      }
    } else {
      return { type: "err", message: `Status Error ${response.status}` };
    }
  } catch (err) {
    console.log(err);
    return { type: "err", message: `${err}` };
  }
};
