import { intro, isCancel, log, outro, select, text } from "@clack/prompts";
import chalk from "chalk";
import nodePath from "path";
import shellescape from "shell-escape";
import { avoidConflicts, ensurePathPresent, openEditor, writeMetadata } from "../../utils/files.js";
import { cancelOperation, gracefullyShutdownUponCtrlC } from "../../utils/term.js";

// Writes a resource to a local directory and links it to PDFMonkey.
//
// @param {object} options
// @param {string} options.type - The resource type (template, snippet)
// @param {object} options.resource - The resource to write
// @param {string} options.label - The name of the resource, for display
// @param {string} [options.path] - Where to write it (default: asked interactively)
// @param {boolean} [options.edit] - Whether to open the editor afterwards
// @param {array} options.pathCandidates - Paths to suggest, relative to the current directory
// @param {Function} options.write - Writes the resource content, (resource, path) => void
//
// @returns {Promise<void>}
export async function initResource({ type, resource, label, path, edit, pathCandidates, write }) {
  intro(`Initializing ${type} ${chalk.yellow(label)}`);

  gracefullyShutdownUponCtrlC(cancelOperation);

  path ??= await askForPath(type, resource, pathCandidates);

  ensurePathPresent(path);
  await avoidConflicts(path);

  log.info("Writing resource");
  await write(resource, path);
  writeMetadata(type, resource.id, path);
  log.info("Resource written");
  openEditor(path, edit);

  log.success(`Your ${type} has been initialized!`);

  printWatchCommand(type, path);

  outro("Bye!");
}

async function askForPath(type, resource, pathCandidates) {
  const currentDir = process.cwd();
  const defaultPath = nodePath.join(currentDir, resource.id);
  const candidates = [defaultPath, ...pathCandidates.map((candidate) => nodePath.join(currentDir, candidate))];

  const pathOptions = candidates.map((candidate) => ({ value: candidate, label: candidate }));
  pathOptions.push({ value: currentDir, label: currentDir });
  pathOptions.push({ value: "custom", label: "A custom path" });

  let path = await select({
    message: `Where should the ${type} code be saved?`,
    options: pathOptions,
  });

  if (path === "custom") {
    path = await text({ message: "Enter the custom path", placeholder: defaultPath });
  }

  if (isCancel(path)) {
    cancelOperation();
  }

  return path;
}

function printWatchCommand(type, path) {
  let watchCommand = ["pdfmonkey", "watch", path];

  if (!process.env.PDFMONKEY_API_KEY) {
    watchCommand = [...watchCommand, "-k", "YOUR_API_KEY"];
  }

  log.info(`Watch your ${type} using: ${shellescape(watchCommand)}`);
}
