import { spawn } from "child_process";
import fs from "fs";
import ffmpegPathDefault from "ffmpeg-static-electron";
import logger from "../../shared/logger.js";

/**
 * Gets path of the FFmpeg from ffmpeg-static-electron. Fall-back is system's FFmpeg.
 * @returns {string} Path of the FFmpeg binary.
 */
const getFfmpegBinary = () => {
  try {
    // Quick checks for common shapes
    if (typeof ffmpegPathDefault === "string") return ffmpegPathDefault;
    if (ffmpegPathDefault && typeof ffmpegPathDefault.default === "string")
      return ffmpegPathDefault.default;
    if (ffmpegPathDefault && typeof ffmpegPathDefault.path === "string")
      return ffmpegPathDefault.path;
    if (ffmpegPathDefault && typeof ffmpegPathDefault.ffmpeg === "string")
      return ffmpegPathDefault.ffmpeg;

    // If it's an object, try to find the first string value anywhere inside it
    if (ffmpegPathDefault && typeof ffmpegPathDefault === "object") {
      const stack = [ffmpegPathDefault];
      const visited = new Set();
      while (stack.length) {
        const obj = stack.pop();
        if (!obj || visited.has(obj)) continue;
        visited.add(obj);
        for (const val of Object.values(obj)) {
          if (typeof val === "string") return val;
          if (val && typeof val === "object") stack.push(val);
        }
      }
    }
  } catch (e) {
    logger.error(
      `[getFfmpegBinary] error while inspecting ffmpegPathDefault: ${e}`
    );
  }

  // Last-resort fallback to system ffmpeg binary name (may not exist)
  logger.warn(
    "[getFfmpegBinary] ffmpeg-static-electron did not provide a path; falling back to 'ffmpeg' in PATH"
  );
  return "ffmpeg";
};

/**
 * Converts video in inputPath path to M4A sound format anmd saves it to outputPath path.
 * @param {string} inputPath - Video path will be converted.
 * @param {string} outputPath - Sound save path.
 * @returns {Promise<object>}
 */
export const convertVideoToM4A = (inputPath, outputPath) => {
  return new Promise((resolve, reject) => {
    // Validate paths
    if (typeof inputPath !== "string") {
      return reject({
        success: false,
        message: `Invalid inputPath type: ${typeof inputPath}`,
      });
    }
    if (typeof outputPath !== "string") {
      return reject({
        success: false,
        message: `Invalid outputPath type: ${typeof outputPath}`,
      });
    }

    if (!fs.existsSync(inputPath)) {
      return reject({ success: false, message: `${inputPath} not found.` });
    }

    const ffmpegBinary = getFfmpegBinary();
    logger.info(
      `[convertVideoToM4A] ffmpegBinary type: ${typeof ffmpegBinary} value: ${ffmpegBinary}`
    );

    if (!ffmpegBinary) {
      return reject({
        success: false,
        message:
          "FFmpeg binary not found (ffmpeg-static-electron returned non-string).",
      });
    }

    const args = [
      "-i",
      inputPath,
      "-vn",
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      "-threads",
      "1",
      "-y",
      outputPath,
    ];

    const ffmpeg = spawn(ffmpegBinary, args);

    ffmpeg.stdout.on("data", (data) => {
      logger.info(`FFmpeg stdout: ${data.toString()}`);
    });

    ffmpeg.stderr.on("data", (data) => {
      logger.info(`FFmpeg stderr: ${data.toString()}`);
    });

    ffmpeg.on("close", (code) => {
      if (code === 0) {
        if (fs.existsSync(outputPath)) {
          resolve({ success: true });
        } else {
          reject({ success: false, message: "Can not create output file." });
        }
      } else {
        reject({ success: false, message: `FFmpeg exit code: ${code}` });
      }
    });

    ffmpeg.on("error", (error) => {
      reject({ success: false, message: `FFmpeg error: ${error.message}` });
    });
  });
};
