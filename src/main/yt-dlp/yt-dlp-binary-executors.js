import path from "path";
import { app } from "electron";
import { execFile } from "child_process";
import { promisify } from "util";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Gets yt-dlp binary path according to OS.
 * @returns {string} yt-dlp binary path.
 */
const getBinaryPath = () => {
  const basePath = app.isPackaged
    ? path.join(process.resourcesPath, "binaries")
    : path.join(__dirname, "../../../binaries");

  let binaryPath = "";
  if (process.platform == "win32") {
    binaryPath = path.join(basePath, "windows/yt-dlp.exe");
  } else if (process.platform === "linux" || process.platform === "openbsd") {
    binaryPath = path.join(basePath, "linux/yt-dlp");
  } else if (process.platform === "darwin") {
    binaryPath = path.join(basePath, "macos/yt-dlp_macos");
  } else {
    return null;
  }

  return binaryPath;
};

const execFileAsync = promisify(execFile);

/**
 * Executes yt-dlp binary according to args.
 * @param {Array<string>} args - CLI arguments for yt-dlp.
 * @returns {object} Result of the command.
 */
export const execYtDlpBinary = async (args) => {
  try {
    const binaryPath = getBinaryPath();
    const { stdout, stderr } = await execFileAsync(binaryPath, args);

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: stderr ? stderr.trim() : "",
    };
  } catch (err) {
    return {
      success: false,
      stdout: "",
      stderr: err.message || String(err),
    };
  }
};
