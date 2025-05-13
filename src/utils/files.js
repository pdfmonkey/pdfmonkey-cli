import chalk from "chalk";
import fs from "fs";
import nodePath from "path";
import { exec } from "child_process";
import { confirm, isCancel, log } from "@clack/prompts";
import { cancelOperation } from "./term.js";

const UUID_PATTERN = /[a-z0-9]{8}(?:-[a-z0-9]{4}){4}[a-z0-9]{8}/i;

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

export function ensurePathPresent(path) {
  if (fs.existsSync(path)) {
    return;
  }

  log.info(`Creating folder ${chalk.yellow(path)}`);
  fs.mkdirSync(path, { recursive: true });
}

export function fileUpdatedAt(path, filename) {
  return fs.statSync(`${path}/${filename}`).mtime;
}

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

export function readFile(path, filename) {
  return fs.readFileSync(`${path}/${filename}`, "utf-8");
}

export function writeFile(path, filename, data) {
  fs.writeFileSync(`${path}/${filename}`, data ?? "", "utf-8");
}

/**
 * Sanitize template identifier by replacing slashes with dashes
 * Used to ensure template names with slashes don't create nested directories
 * @param {string} identifier - The template identifier to sanitize
 * @returns {string} The sanitized identifier
 */
export function sanitizeIdentifier(identifier) {
  return identifier?.replace(/\//g, "-");
}

export function writeMetadata(type, id, path) {
  writeFile(path, ".pdfmonkey.json", JSON.stringify({ type, id }, {}, 2));
}

export function writeSnippetContent(snippet, path) {
  log.info("Writing snippet code");
  writeFile(path, "code.liquid", snippet.code);
}

export function writeTemplateContent(template, path) {
  log.info("Writing template body");
  writeFile(path, "body.html.liquid", template.body_draft);

  log.info("Writing template styles");
  writeFile(path, "styles.scss", template.scss_style_draft);

  log.info("Writing template sample data");
  writeFile(path, "sample_data.json", template.sample_data_draft);
}
