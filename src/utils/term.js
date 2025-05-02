import { cancel } from "@clack/prompts";

// Gracefully shutdown the server when the user presses Ctrl-C
//
// @param {Function} callback - The callback to call when the user presses Ctrl-C
//
// @example
//
// ```js
// gracefullyShutdown(() => {
//   console.log("Shutting down");
// });
// ```
//
// @returns {void}
export function gracefullyShutdownUponCtrlC(callback) {
  process.on("SIGINT", () => {
    process.stdout.write("\r   \r");
    callback();
    process.exit(0);
  });
}

// Cancel the operation and exit the program
//
// @returns {void}
export function cancelOperation() {
  cancel("Operation canceled");
  process.exit(0);
}
