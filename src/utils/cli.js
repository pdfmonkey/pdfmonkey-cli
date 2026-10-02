import chalk from "chalk";

import { describeError } from "./pdfmonkey.js";

// Wraps a command action so errors are printed nicely and the process exits with a non-zero code.
//
// @param {Function} action - The command action
//
// @returns {Function} The wrapped action
export function run(action) {
  return async (...args) => {
    try {
      await action(...args);
    } catch (error) {
      console.error(chalk.red(describeError(error)));
      process.exitCode = 1;
    }
  };
}
