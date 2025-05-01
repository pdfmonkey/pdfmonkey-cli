import chalk from "chalk";
import { exec } from "child_process";
import nodePath from "path";
import { confirm, intro, isCancel, cancel, log, outro, select, text } from "@clack/prompts";
import { existsSync, mkdirSync, readdirSync } from "fs";

import { gracefullyShutdownUponCtrlC } from "../utils/term.js";
import { getTemplate, getWorkspaces, getTemplates } from "../utils/pdfmonkey.js";
import { writeTemplateContent } from "../utils/files.js";

export default async function initCommand(templateId, path, { apiKey, edit }) {
  templateId ??= await runTemplateSelection(apiKey);

  intro(`Initializing template ${chalk.yellow(templateId)}`);

  gracefullyShutdownUponCtrlC(cancelOperation);

  let template = await getTemplate(templateId, apiKey);
  if (!template) {
    cancelOperation();
  }

  path ??= await askForPath(templateId);

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

  if (path == process.cwd() && templateFolder == templateId) {
    watchCommand = "pdfmonkey watch";
  } else if (path == process.cwd()) {
    watchCommand = `pdfmonkey watch -t ${templateId}`;
  } else if (templateFolder == templateId) {
    watchCommand = `pdfmonkey watch ${path}`;
  } else {
    watchCommand = `pdfmonkey watch ${path} -t ${templateId}`;
  }

  if (!process.env.PDFMONKEY_API_KEY) {
    watchCommand += " -k YOUR_API_KEY";
  }

  log.info(`Watch your template using: ${watchCommand}`);
}

async function askForPath(templateId) {
  let currentDir = process.cwd();
  let defaultPath = nodePath.join(currentDir, templateId);

  let path = await select({
    message: "Where should the template files be saved?",
    options: [
      { value: defaultPath, label: defaultPath },
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

function cancelOperation() {
  cancel("Operation canceled");
  process.exit(0);
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
  const templateId = await pickTemplate(workspaceId, apiKey);

  return templateId;
}

async function pickWorkspace(apiKey) {
  intro("Fetching workspaces...");

  let selectedWorkspace;
  const workspaces = await getWorkspaces(apiKey);

  if (!workspaces || workspaces.length === 0) {
    outro("No workspaces found");
    cancelOperation();
  }

  if (workspaces.length === 1) {
    selectedWorkspace = workspaces[0];
  } else {
    selectedWorkspace = await select({
      message: "Select a workspace",
      options: workspaces.map((workspace) => ({
        value: workspace,
        label: workspace.identifier,
      })),
    });
  }

  if (isCancel(selectedWorkspace)) {
    cancelOperation();
  }

  outro(`Using workspace: ${chalk.yellow(selectedWorkspace.identifier)}`);

  return selectedWorkspace.id;
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

  return selectedTemplate.id;
}
