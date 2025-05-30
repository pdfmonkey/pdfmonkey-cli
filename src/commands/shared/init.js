import { intro, isCancel, log, outro, select, text } from "@clack/prompts";
import chalk from "chalk";
import nodePath from "path";
import shellescape from "shell-escape";
import { avoidConflicts, ensurePathPresent, openEditor, writeMetadata } from "../../utils/files.js";
import { cancelOperation, gracefullyShutdownUponCtrlC } from "../../utils/term.js";

export async function initResource(resourceInfo) {
  let path = resourceInfo.path;
  const { type, fetch, displayName, write, edit, pathCandidates } = resourceInfo;
  const resource = await fetch();

  intro(`Initializing ${type} ${chalk.yellow(displayName(resource))}`);

  gracefullyShutdownUponCtrlC(cancelOperation);

  path ??= await askForPath(resource, pathCandidates);

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

async function askForPath(resource, pathCandidates) {
  let currentDir = process.cwd();
  let defaultPath = nodePath.join(currentDir, resource.id);
  const candidates = [defaultPath, ...pathCandidates(currentDir, resource)];

  const pathOptions = candidates.filter(Boolean).map((candidate) => ({ value: candidate, label: candidate }));
  pathOptions.push({ value: currentDir, label: currentDir });
  pathOptions.push({ value: "custom", label: "A custom path" });

  let path = await select({
    message: `Where should the ${resource.type} code be saved?`,
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
