import chalk from "chalk";
import chokidar from "chokidar";
import { spinner } from "@clack/prompts";

import { describeError } from "./pdfmonkey.js";

// Watches files in a directory and executes a callback on changes.
//
// @param {string} path - The path to watch for file changes
// @param {Function} callback - Function to execute when a file changes, a thrown error is reported as a failed sync
//
// @returns {void}
export function watchFiles(path, callback) {
  chokidar.watch(path, { ignoreInitial: true }).on("all", async (event, filePath) => {
    const message = `Updated: ${filePath.split("/").pop()}`;
    const spin = spinner();
    spin.start(message);

    try {
      await callback();
      spin.stop(`${message} - ${chalk.green("synced!")}`);
    } catch (error) {
      spin.stop(chalk.red(describeError(error)), 1);
    }
  });
}
