import { app } from "electron";
import fsPromises from "fs/promises";
import path from "path";

const logPath = path.join(app.getPath("userData"), "logs");

fsPromises.mkdir(logPath, { recursive: true }).catch(() => {});

const file = path.join(logPath, "app.log");

const logger = {
  info: async (msg) => await write("INFO", msg),
  warn: async (msg) => await write("WARN", msg),
  error: async (msg) => await write("ERROR", msg),
};

/**
 * Write a message to the log file.
 * @param {*} level - The log level.
 * @param {*} msg - The message to log.
 */
async function write(level, msg) {
  const line = `[${new Date().toISOString()}] [${level}] ${msg}\n`;

  try {
    await fsPromises.appendFile(file, line);
  } catch (e) {
    console.log("[logger.js/write] Can not access log file.");
    console.error(e);
  }
}

export default logger;
