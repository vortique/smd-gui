import path from "path";
import fs from "fs";
import { app } from "electron";
import { execYtDlpBinary } from "./yt-dlp-binary-executors.js";
import { isMismatchedSongName } from "../utils/query-filter.js";
import { convertVideoToM4A } from "../utils/convert-video-to-audio.js";
import logger from "../../shared/logger.js";

/**
 * Updates yt-dlp binary.
 * @returns {object} Result of the update.
 */
export const updateYtDlp = async () => {
  try {
    const result = await execYtDlpBinary(["-U"]);

    if (result.success) {
      logger.info(JSON.stringify(result));

      return { success: true };
    }

    logger.info(result.stderr);
    return { success: false };
  } catch (err) {
    logger.info(err);
    return { success: false };
  }
};

/**
 * Searchs songName in Youtube.
 * @param {string} songName - The song will be searched.
 * @returns {object} Result of the search.
 */
const searchSong = async (songName, searchCount = 3) => {
  try {
    const result = await execYtDlpBinary([
      "--no-warnings",
      "--get-id",
      "--get-title",
      `ytsearch${searchCount}:${songName}`,
    ]);

    if (result.success === false) {
      return { success: false, message: result.stderr };
    }

    const searchResults = result.stdout.split("\n");

    for (let i = 0; i < searchResults.length; i += 2) {
      const foundSongName = searchResults[i];
      const songId = searchResults[i + 1];

      if (!foundSongName || !songId) {
        continue;
      }

      if (!isMismatchedSongName(songName, foundSongName)) {
        return { success: true, result: songId };
      }
    }

    return { success: false, message: "No video found." };
  } catch (err) {
    logger.error(`Search song error: ${err}`);
    return { success: false, message: "Error while searching video." };
  }
};

export const downloadSong = async (songName, outputPath, searchCount = 3) => {
  try {
    logger.info(
      `[downloadSong] songName type: ${typeof songName}, value: ${songName}`
    );
    logger.info(
      `[downloadSong] outputPath type: ${typeof outputPath}, value: ${outputPath}`
    );

    // Ensure songName is a string
    if (typeof songName !== "string") {
      throw new Error(
        `Invalid songName: expected string, got ${typeof songName}`
      );
    }
    if (typeof outputPath !== "string") {
      throw new Error(
        `Invalid outputPath: expected string, got ${typeof outputPath}`
      );
    }

    const searchResult = await searchSong(songName, searchCount);

    logger.info(JSON.stringify(searchResult));

    if (searchResult.success === false) {
      logger.error(searchResult.message);
      return { success: false, message: searchResult.message };
    }

    const videoId = searchResult.result;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const tempVideoPath = path
      .join(app.getPath("temp"), `${Date.now()}.webm`)
      .toString();

    const downloadResult = await execYtDlpBinary([
      "--no-warnings",
      "-o",
      `${tempVideoPath}`,
      videoUrl,
    ]);

    if (downloadResult.success === false) {
      logger.error(downloadResult.stderr);
      return { success: false, message: downloadResult.stderr };
    }

    // Build output file path (not just directory) and sanitize filename
    const sanitize = (name) =>
      name
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 200);

    const filename = `${sanitize(songName)}.m4a`;
    const outputFilePath = path.join(outputPath, filename);

    const convertingResult = await convertVideoToM4A(
      tempVideoPath,
      outputFilePath
    );

    // Remove temporary video file regardless of result
    try {
      await fs.promises.unlink(tempVideoPath).catch(() => {});
    } catch (e) {
      // ignore
    }

    if (convertingResult.success === true) {
      logger.info("Downloading complete.");
      return { success: true, path: outputFilePath };
    } else {
      logger.error(convertingResult.message);
      return { success: false, message: convertingResult.message };
    }
  } catch (err) {
    logger.error(`Download song error: ${err}`);
    return { success: false, message: String(err) };
  }
};
