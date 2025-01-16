import fs from "fs";
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

export function writeTemplateContent(template, path) {
  log.info("Writing template body");
  writeFile(path, "body.html.liquid", template.body_draft);

  log.info("Writing template styles");
  writeFile(path, "styles.scss", template.scss_style_draft);

  log.info("Writing template sample data");
  writeFile(path, "sample_data.json", template.sample_data_draft);
}
