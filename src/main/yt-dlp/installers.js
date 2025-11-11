import path from "path";
import { app } from "electron";
import { execYtDlpBinary } from "./yt-dlp-binary-executors.js";

export const updateYtDlp = async () => {
  try {
    const result = await execYtDlpBinary(["-U"]);

    if (result) {
      console.log(result);

      return { success: true };
    }

    return { success: false };
  } catch (err) {
    console.log(err);
    return { success: false };
  }
}