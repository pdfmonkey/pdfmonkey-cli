import chalk from "chalk";
import fs from "fs";
import { confirm, isCancel } from "@clack/prompts";

import { UUID_PATTERN } from "./files.js";
import { describeError, getClient, getWorkspaces } from "./pdfmonkey.js";
import { cancelOperation } from "./term.js";
import { pickWorkspace } from "../commands/shared/pick.js";

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

// Whether prompts can be displayed (and answered) safely.
//
// @returns {boolean}
export function isInteractive() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
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

// Reads a JSON value given inline, as @path/to/file.json, or as - (stdin).
//
// @param {string} [value] - The raw option value
//
// @returns {string|undefined} The JSON string, validated
export function readJsonInput(value) {
  if (value === undefined) {
    return undefined;
  }

  let json = value;

  if (value === "-") {
    json = fs.readFileSync(0, "utf-8");
  } else if (value.startsWith("@")) {
    json = fs.readFileSync(value.slice(1), "utf-8");
  }

  try {
    JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid JSON: ${error.message}`, { cause: error });
  }

  return json;
}

// Converts a date (ISO 8601) or a UNIX timestamp into a UNIX timestamp, as expected by the API.
//
// @param {string} [value] - The raw option value
//
// @returns {number|undefined} The timestamp in seconds
export function parseTimestamp(value) {
  if (value === undefined) {
    return undefined;
  }

  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const time = Date.parse(value);

  if (Number.isNaN(time)) {
    throw new Error(`Invalid date: ${value}`);
  }

  return Math.floor(time / 1000);
}

// Asks for confirmation before a destructive action, unless --yes was given.
//
// @param {string} message - The confirmation question
// @param {boolean} yes - Whether confirmation was given upfront
//
// @returns {Promise<void>}
export async function confirmDestruction(message, yes) {
  if (yes) {
    return;
  }

  if (!isInteractive()) {
    throw new Error("Refusing to delete without confirmation, use --yes to proceed.");
  }

  const confirmed = await confirm({ message, initialValue: false });

  if (isCancel(confirmed) || !confirmed) {
    cancelOperation();
  }
}

// Resolves a workspace given by ID or name.
//
// Falls back on the PDFMONKEY_WORKSPACE environment variable, then on an interactive selection.
//
// @param {string} [value] - Workspace ID or name
// @param {string} apiKey - The API key to use
// @param {object} [options]
// @param {boolean} [options.required=true] - Whether a workspace must be found
//
// @returns {Promise<string|undefined>} The workspace ID
export async function resolveWorkspace(value = process.env.PDFMONKEY_WORKSPACE, apiKey, { required = true } = {}) {
  if (!value) {
    if (!required) {
      return undefined;
    }

    if (isInteractive()) {
      return await pickWorkspace(apiKey);
    }

    throw new Error("A workspace is required, use --workspace <id|name> or set PDFMONKEY_WORKSPACE.");
  }

  if (UUID_PATTERN.test(value)) {
    return value;
  }

  const workspaces = await getWorkspaces(apiKey);
  return findByIdentifier(workspaces, value, "Workspace").id;
}

// Resolves a template folder given by ID or name. "none" is kept as is.
//
// @param {string} [value] - Folder ID, name or "none"
// @param {Function} getWorkspaceId - Returns the workspace ID, only called to resolve a name
// @param {string} apiKey - The API key to use
//
// @returns {Promise<string|undefined>} The folder ID or "none"
export async function resolveFolder(value, getWorkspaceId, apiKey) {
  if (!value || value === "none" || UUID_PATTERN.test(value)) {
    return value;
  }

  const workspaceId = await getWorkspaceId();

  if (!workspaceId) {
    throw new Error("Finding a folder by name requires a workspace, use --workspace <id|name>.");
  }

  const folders = await getClient(apiKey).templateFolders.listAll({ workspace_id: workspaceId });
  return findByIdentifier(folders, value, "Folder").id;
}

// Resolves a PDF engine given by ID or name (e.g. v5).
//
// @param {string} [value] - Engine ID or name
// @param {string} apiKey - The API key to use
//
// @returns {Promise<string|undefined>} The engine ID
export async function resolveEngine(value, apiKey) {
  if (!value || UUID_PATTERN.test(value)) {
    return value;
  }

  const engines = await getClient(apiKey).pdfEngines.list();
  const engine = engines.find(({ name }) => name === value);

  if (!engine) {
    throw new Error(`Unknown engine ${value}, available engines: ${engines.map(({ name }) => name).join(", ")}`);
  }

  return engine.id;
}

function findByIdentifier(items, identifier, label) {
  const matches = items.filter((item) => item.identifier.toLowerCase() === identifier.toLowerCase());

  if (matches.length === 0) {
    throw new Error(`${label} not found: ${identifier}`);
  }

  if (matches.length > 1) {
    throw new Error(`Several items are named ${identifier}, use an ID instead.`);
  }

  return matches[0];
}

// Removes undefined values from an object, to only send what was given.
//
// @param {object} object - The object to compact
//
// @returns {object} The compacted object
export function compact(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}

// Formats an API timestamp for human output.
//
// @param {string} [timestamp] - An ISO 8601 timestamp
//
// @returns {string} The formatted date
export function formatDate(timestamp) {
  return timestamp ? new Date(timestamp).toLocaleString() : "";
}
