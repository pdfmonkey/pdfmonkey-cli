import chalk from "chalk";
import chokidar from "chokidar";
import { spinner } from "@clack/prompts";

// Watches files in a directory and executes a callback on changes.
//
// @param {string} path - The path to watch for file changes
// @param {Function} callback - Function to execute when a file changes, must return an object with success property
//
// @returns {void}
export function watchFiles(path, callback) {
  chokidar.watch(path, { ignoreInitial: true }).on("all", async (event, filePath) => {
    let message = `Updated: ${filePath.split("/").pop()}`;
    let spin = spinner();
    spin.start(message);

    let result = await callback(event, filePath);

    if (result.success) {
      spin.stop(`${message} - ${chalk.green("synced!")}`);
    } else {
      spin.stop(chalk.red(result.errors), 1);
    }
  });
}
