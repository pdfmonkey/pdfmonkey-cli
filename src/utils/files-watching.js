import chalk from "chalk";
import chokidar from "chokidar";
import { spinner } from "@clack/prompts";

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
