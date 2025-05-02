import chalk from "chalk";
import shellescape from "shell-escape";
import { exec } from "child_process";
import nodePath from "path";
import { confirm, intro, isCancel, log, outro, select, text } from "@clack/prompts";
import { existsSync } from "fs";

import { cancelOperation, gracefullyShutdownUponCtrlC } from "../../utils/term.js";
import { getSnippet, getSnippets } from "../../utils/pdfmonkey.js";
import { writeSnippetContent } from "../../utils/files.js";
import { pickWorkspace } from "../shared/workspace.js";

export default async function initCommand(snippetId, path, { apiKey, edit }) {
  let snippet = null;

  if (snippetId) {
    snippet = await getSnippet(snippetId, apiKey);
  } else {
    snippet = await runSnippetSelection(apiKey);
    snippetId = snippet.id;
  }

  intro(`Initializing snippet ${chalk.yellow(snippet.display_name)}`);

  gracefullyShutdownUponCtrlC(cancelOperation);

  path ??= await askForPath(snippet);

  await avoidConflicts(path);
  writeSnippetContent(snippet, path);
  openEditor(path, edit);

  log.success("Snippet initialized!");

  printWatchCommand(path, snippetId);

  outro("Bye!");
}

function printWatchCommand(path, snippetId) {
  let watchCommand;
  const snippetFile = nodePath.basename(path, ".liquid");
  const watchCommandBase = ["pdfmonkey", "snippet", "watch"];

  if (snippetFile == snippetId) {
    watchCommand = [...watchCommandBase, path];
  } else {
    watchCommand = [...watchCommandBase, path, "-s", snippetId];
  }

  if (!process.env.PDFMONKEY_API_KEY) {
    watchCommand.push("-k", "YOUR_API_KEY");
  }

  log.info(`Watch your snippet using: ${shellescape(watchCommand)}`);
}

async function askForPath(snippet) {
  let currentDir = process.cwd();
  let defaultPath = nodePath.join(currentDir, `${snippet.id}.liquid`);

  const candidates = [defaultPath, nodePath.join(currentDir, `${snippet.sanitized_identifier}.liquid`)];

  const pathOptions = candidates.filter(Boolean).map((candidate) => ({ value: candidate, label: candidate }));
  pathOptions.push({ value: "custom", label: "A custom path" });

  let path = await select({
    message: "Where should the snippet file be saved?",
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

async function avoidConflicts(path) {
  if (!existsSync(path)) {
    return;
  }

  log.warn(`File ${chalk.yellow(path)} already exists.`);

  let overwrite = await confirm({
    message: "Are you sure you want to overwrite this file at the risk of losing data?",
    initialValue: false,
  });

  if (!overwrite || isCancel(overwrite)) {
    cancelOperation();
  }
}

function openEditor(path, edit) {
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

async function runSnippetSelection(apiKey) {
  const workspaceId = await pickWorkspace(apiKey);
  const snippetInfo = await pickSnippet(workspaceId, apiKey);

  return snippetInfo;
}

async function pickSnippet(workspaceId, apiKey) {
  intro("Fetching snippets...");

  let selectedSnippet;
  const snippets = await getSnippets(workspaceId, apiKey);

  if (!snippets || snippets.length === 0) {
    outro("No snippets found");
    cancelOperation();
  }

  if (snippets.length === 1) {
    selectedSnippet = snippets[0];
  } else {
    selectedSnippet = await select({
      message: "Select a snippet",
      options: snippets.map((snippet) => ({
        value: snippet,
        label: snippet.display_name,
      })),
    });
  }

  if (isCancel(selectedSnippet)) {
    cancelOperation();
  }

  outro(`Using snippet: ${chalk.yellow(selectedSnippet.display_name)}`);

  return selectedSnippet;
}
