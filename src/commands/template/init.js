import chalk from "chalk";
import nodePath from "path";
import { intro, isCancel, outro, select } from "@clack/prompts";

import { writeTemplateContent } from "../../utils/files.js";
import { getTemplate, getTemplateCard, getTemplateCards } from "../../utils/pdfmonkey.js";
import { cancelOperation } from "../../utils/term.js";
import { initResource } from "../shared/init.js";
import { pickWorkspace } from "../shared/workspace.js";

export default async function initCommand(templateId, path, { apiKey, edit }) {
  initResource({
    id: templateId,
    type: "template",
    path,
    edit,
    displayName: (template) => template.display_name,
    fetch: () => fetchTemplate(templateId, apiKey),
    pathCandidates,
    write: (templateCard, path) => write(templateCard, path, apiKey),
    watchCommand,
  });
}

async function fetchTemplate(templateId, apiKey) {
  let templateCard = null;

  if (templateId) {
    templateCard = await getTemplateCard(templateId, apiKey);
  } else {
    templateCard = await runTemplateSelection(apiKey);
    templateId = templateCard.id;
  }

  return templateCard;
}

function pathCandidates(currentDir, templateCard) {
  const candidates = [nodePath.join(currentDir, templateCard.sanitized_identifier)];

  if (templateCard.sanitized_folder_identifier) {
    candidates.push(
      nodePath.join(currentDir, templateCard.sanitized_folder_identifier, templateCard.id),
      nodePath.join(currentDir, templateCard.sanitized_folder_identifier, templateCard.sanitized_identifier),
    );
  }

  return candidates;
}

async function pickTemplate(workspaceId, apiKey) {
  intro("Fetching templates...");

  let selectedTemplate;
  const templates = await getTemplateCards(workspaceId, apiKey);

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

  return selectedTemplate;
}

async function runTemplateSelection(apiKey) {
  const workspaceId = await pickWorkspace(apiKey);
  const templateInfo = await pickTemplate(workspaceId, apiKey);

  return templateInfo;
}

function watchCommand(path, templateId) {
  let watchCommand;
  const watchCommandBase = ["pdfmonkey", "template", "watch"];
  const templateFolder = nodePath.basename(path);

  if (path == process.cwd() && templateFolder == templateId) {
    watchCommand = watchCommandBase;
  } else if (path == process.cwd()) {
    watchCommand = [...watchCommandBase, "-t", templateId];
  } else if (templateFolder == templateId) {
    watchCommand = [...watchCommandBase, path];
  } else {
    watchCommand = [...watchCommandBase, path, "-t", templateId];
  }

  return watchCommand;
}

async function write(templateCard, path, apiKey) {
  const template = await getTemplate(templateCard.id, apiKey);
  writeTemplateContent(template, path);
}
