import chalk from "chalk";
import fs from "fs";
import nodePath from "path";
import { exec } from "child_process";
import { confirm, isCancel, log } from "@clack/prompts";
import { cancelOperation } from "./term.js";

const UUID_PATTERN = /[a-z0-9]{8}(?:-[a-z0-9]{4}){4}[a-z0-9]{8}/i;

// Checks if there are already files in the specified path and asks for confirmation to overwrite.
//
// @param {string} path - Directory path to check
//
// @returns {Promise<void>}
export async function avoidConflicts(path) {
  let files = fs.readdirSync(path);

  if (files.length == 0) {
    return;
  }

  log.warn(`Files are already present in ${chalk.yellow(path)}.`);

  let overwrite = await confirm({
    message: "Are you sure you want to use this folder at the risk of losing data?",
    initialValue: false,
  });

  if (!overwrite || isCancel(overwrite)) {
    cancelOperation();
  }
}

// Creates a directory if it doesn't exist.
//
// @param {string} path - Directory path to ensure exists
//
// @returns {void}
export function ensurePathPresent(path) {
  if (fs.existsSync(path)) {
    return;
  }

  log.info(`Creating folder ${chalk.yellow(path)}`);
  fs.mkdirSync(path, { recursive: true });
}

// Gets the last modification time of a file.
//
// @param {string} path - Directory containing the file
// @param {string} filename - Name of the file
//
// @returns {Date} The last modification time
export function fileUpdatedAt(path, filename) {
  return fs.statSync(`${path}/${filename}`).mtime;
}

// Retrieves resource metadata from the .pdfmonkey.json file.
//
// @param {string} path - Path to the resource directory
//
// @returns {object|null} The resource metadata or null if not found/invalid
export function getResourceMetadata(path) {
  try {
    if (fs.existsSync(`${path}/.pdfmonkey.json`)) {
      const metadata = JSON.parse(readFile(path, ".pdfmonkey.json"));

      if (metadata && metadata.type && metadata.id) {
        return metadata;
      }
    }
  } catch (error) {
    log.error(`Error parsing metadata for ${chalk.yellow(path)}: ${error.message}`);
    return null;
  }

  log.error(`No proper metadata found for ${chalk.yellow(path)}`);
  return null;
}

// Gets the resource ID from the .pdfmonkey.json file or from parameters.
//
// @param {string} type - The resource type (template, snippet)
// @param {string} resourceId - Optional explicit resource ID
// @param {string} path - Directory path to the resource
//
// @returns {string} The resource ID
export function getResourceId(type, resourceId, path) {
  if (fs.existsSync(`${path}/.pdfmonkey.json`)) {
    const json = readFile(path, ".pdfmonkey.json");
    const { id } = JSON.parse(json);
    return id;
  }

  const id = resourceId ?? nodePath.basename(path);

  // Only write metadata for proper UUIDs
  if (id.match(UUID_PATTERN)) {
    writeMetadata(type, resourceId, path);
  }

  return id;
}

// Opens the specified path in the user's preferred editor.
//
// @param {string} path - Path to the file or directory to open
// @param {boolean} edit - Whether to open the editor
//
// @returns {void}
export function openEditor(path, edit) {
  if (!edit) {
    return;
  }

  if (process.env.EDITOR) {
    log.info(`Opening ${chalk.yellow(path)} in ${chalk.yellow(process.env.EDITOR)}`);
    exec(`${process.env.EDITOR} "${path}"`);
  } else {
    log.error("No editor found. Please set the EDITOR environment variable to use this feature.");
  }
}

// Reads the contents of a file.
//
// @param {string} path - Directory containing the file
// @param {string} filename - Name of the file to read
//
// @returns {string} The file contents
export function readFile(path, filename) {
  return fs.readFileSync(`${path}/${filename}`, "utf-8");
}

// Writes data to a file.
//
// @param {string} path - Directory where the file should be written
// @param {string} filename - Name of the file to write
// @param {string} data - Content to write to the file
//
// @returns {void}
export function writeFile(path, filename, data) {
  fs.writeFileSync(`${path}/${filename}`, data ?? "", "utf-8");
}

// Sanitizes template identifier by replacing slashes with dashes.
//
// @param {string} identifier - The template identifier to sanitize
//
// @returns {string} The sanitized identifier
export function sanitizeIdentifier(identifier) {
  return identifier?.replace(/\//g, "-");
}

// Writes resource metadata to the .pdfmonkey.json file.
//
// @param {string} type - The resource type (template, snippet)
// @param {string} id - The resource ID
// @param {string} path - Directory path where metadata should be written
//
// @returns {void}
export function writeMetadata(type, id, path) {
  writeFile(path, ".pdfmonkey.json", JSON.stringify({ type, id }, {}, 2));
}

// Writes snippet content to the code.liquid file.
//
// @param {object} snippet - The snippet object containing code
// @param {string} path - Directory path where the snippet should be written
//
// @returns {void}
export function writeSnippetContent(snippet, path) {
  log.info("Writing snippet code");
  writeFile(path, "code.liquid", snippet.code);
}

// Writes template content to the appropriate files.
//
// @param {object} template - The template object containing body, styles, and sample data
// @param {string} path - Directory path where the template files should be written
//
// @returns {void}
export function writeTemplateContent(template, path) {
  log.info("Writing template body");
  writeFile(path, "body.html.liquid", template.body_draft);

  log.info("Writing template styles");
  writeFile(path, "styles.scss", template.scss_style_draft);

  log.info("Writing template sample data");
  writeFile(path, "sample_data.json", template.sample_data_draft);
}
