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

// Prints data as JSON when requested, using the human formatter otherwise.
//
// @param {any} data - The data to print
// @param {object} options - Command options, `json` toggles JSON output
// @param {Function} human - Formatter used for human output
//
// @returns {void}
export function output(data, { json }, human) {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    human(data);
  }
}

// Prints rows as an aligned table.
//
// @param {array} rows - The rows to print
// @param {array} columns - Pairs of [header, (row) => value]
//
// @returns {void}
export function printTable(rows, columns) {
  if (rows.length === 0) {
    console.log(chalk.dim("Nothing found."));
    return;
  }

  const cells = rows.map((row) => columns.map(([, value]) => String(value(row) ?? "")));
  const widths = columns.map(([header], index) => Math.max(header.length, ...cells.map((line) => line[index].length)));
  const format = (line) =>
    line
      .map((cell, index) => cell.padEnd(widths[index]))
      .join("  ")
      .trimEnd();

  console.log(chalk.bold(format(columns.map(([header]) => header))));
  cells.forEach((line) => console.log(format(line)));
}

// Prints label/value pairs, skipping empty values.
//
// @param {array} pairs - Pairs of [label, value]
//
// @returns {void}
export function printDetails(pairs) {
  const visiblePairs = pairs.filter(([, value]) => value !== null && value !== undefined && value !== "");
  const width = Math.max(...visiblePairs.map(([label]) => label.length));

  visiblePairs.forEach(([label, value]) => console.log(`${chalk.bold(label.padEnd(width))}  ${value}`));
}

// Formats an API timestamp for human output.
//
// @param {string} [timestamp] - An ISO 8601 timestamp
//
// @returns {string} The formatted date
export function formatDate(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleString() : "";
}
