import chalk from "chalk";
import shellescape from "shell-escape";
import { exec } from "child_process";
import nodePath from "path";
import { confirm, intro, isCancel, log, outro, select, text } from "@clack/prompts";
import { existsSync, mkdirSync, readdirSync } from "fs";

import { cancelOperation, gracefullyShutdownUponCtrlC } from "../../utils/term.js";
import { getTemplate, getTemplates } from "../../utils/pdfmonkey.js";
import { writeTemplateContent, sanitizeIdentifier } from "../../utils/files.js";
import { pickWorkspace } from "../shared/workspace.js";

export default async function initCommand(templateId, path, { apiKey, edit }) {
  let templateIdentifier;

  if (!templateId) {
    const { id, identifier } = await runTemplateSelection(apiKey);
    templateId = id;
    templateIdentifier = identifier;
  }

  intro(`Initializing template ${chalk.yellow(templateId)}`);

  gracefullyShutdownUponCtrlC(cancelOperation);

  let template = await getTemplate(templateId, apiKey);
  if (!template) {
    cancelOperation();
  }

  templateIdentifier ??= template.identifier;

  path ??= await askForPath(templateId, sanitizeIdentifier(templateIdentifier));

  ensurePathPresent(path);
  await avoidConflicts(path);
  writeTemplateContent(template, path);
  openEditor(path, edit);

  log.success("Template initialized!");

  printWatchCommand(path, templateId);

  outro("Bye!");
}

function printWatchCommand(path, templateId) {
  let watchCommand;
  const templateFolder = path.split("/").pop();

  const watchCommandBase = ["pdfmonkey", "template", "watch"];

  if (path == process.cwd() && templateFolder == templateId) {
    watchCommand = watchCommandBase;
  } else if (path == process.cwd()) {
    watchCommand = [...watchCommandBase, "-t", templateId];
  } else if (templateFolder == templateId) {
    watchCommand = [...watchCommandBase, path];
  } else {
    watchCommand = [...watchCommandBase, path, "-t", templateId];
  }

  if (!process.env.PDFMONKEY_API_KEY) {
    watchCommand.push("-k", "YOUR_API_KEY");
  }

  log.info(`Watch your template using: ${shellescape(watchCommand)}`);
}

async function askForPath(templateId, templateIdentifier) {
  let currentDir = process.cwd();
  let defaultPath = nodePath.join(currentDir, templateId);
  let identifierPath = nodePath.join(currentDir, templateIdentifier);

  let path = await select({
    message: "Where should the template files be saved?",
    options: [
      { value: defaultPath, label: defaultPath },
      { value: identifierPath, label: identifierPath },
      { value: currentDir, label: currentDir },
      { value: "custom", label: "A custom path" },
    ],
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
  let files = readdirSync(path);

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

function ensurePathPresent(path) {
  if (existsSync(path)) {
    return;
  }

  log.info(`Creating folder ${chalk.yellow(path)}`);
  mkdirSync(path, { recursive: true });
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

async function runTemplateSelection(apiKey) {
  const workspaceId = await pickWorkspace(apiKey);
  const templateInfo = await pickTemplate(workspaceId, apiKey);

  return templateInfo;
}

async function pickTemplate(workspaceId, apiKey) {
  intro("Fetching templates...");

  let selectedTemplate;
  const templates = await getTemplates(workspaceId, apiKey);

  if (!templates || templates.length === 0) {
    outro("No templates found");
    cancelOperation();
  }

  if (templates.length === 1) {
    selectedTemplate = templates[0];
  } else {
    selectedTemplate = await select({
      message: "Select a template",
      options: templates.map((template) => ({
        value: template,
        label: template.display_name,
      })),
    });
  }

  if (isCancel(selectedTemplate)) {
    cancelOperation();
  }

  outro(`Using template: ${chalk.yellow(selectedTemplate.display_name)}`);

  return {
    id: selectedTemplate.id,
    identifier: selectedTemplate.identifier,
  };
}
