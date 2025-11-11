import path from "path";
import { app } from "electron";
import { execFile } from "child_process";
import { promisify } from "util";

import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export const execYtDlpBinary = async (args) => {
  try {
    const binaryPath = getBinaryPath();
    const { stdout, stderr } = await execFileAsync(binaryPath, args);
    if (stderr) return console.error('stderr:', stderr);
    return stdout.trim();
  } catch (err) {
    throw new Error(`Binary execution error: ${err.message}`);
  }
};
