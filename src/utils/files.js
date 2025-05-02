import fs from "fs";
import path from "path";
import { log } from "@clack/prompts";

export function fileUpdatedAt(path, filename) {
  return fs.statSync(`${path}/${filename}`).mtime;
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

export function writeTemplateContent(template, path) {
  log.info("Writing template body");
  writeFile(path, "body.html.liquid", template.body_draft);

  log.info("Writing template styles");
  writeFile(path, "styles.scss", template.scss_style_draft);

  log.info("Writing template sample data");
  writeFile(path, "sample_data.json", template.sample_data_draft);
}

export function writeSnippetContent(snippet, filePath) {
  const folder = path.dirname(filePath);
  const filename = path.basename(filePath);

  log.info(`Writing snippet code to ${filename}`);
  writeFile(folder, filename, snippet.code);
}
