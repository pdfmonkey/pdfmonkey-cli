import { log } from "@clack/prompts";
import { readFile } from "./files.js";
import { attributeNames } from "./constants.js";

function buildTemplateData(path) {
  const body_draft = readFile(path, "body.html.liquid");
  const scss_style_draft = readFile(path, "styles.scss");
  const sample_data_draft = readFile(path, "sample_data.json");

  return JSON.stringify({ body_draft, scss_style_draft, sample_data_draft });
}

// Get a template from PDFMonkey
//
// @param {string} templateId - The ID of the template to get
// @param {string} apiKey - The API key to use
//
// @returns {Promise<object>} The template
export async function getTemplate(templateId, apiKey) {
  const url = `https://api.pdfmonkey.io/api/v1/document_templates/${templateId}`;
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const response = await fetch(url, { headers });
  const json = await response.json();

  if (json.errors) {
    log.error(formatErrors(json.errors));
    return null;
  }

  return json.document_template;
}

export async function getTemplateDebugUrl(templateId, apiKey) {
  let url = `https://api.pdfmonkey.io/api/v1/document_template_debugs/${templateId}`;
  let headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  let response = await fetch(url, { headers });
  let json = await response.json();

  return json.document_template_debug.url;
}

export async function getTemplatePreviewUrl(template, apiKey, debug) {
  if (debug) {
    return await getTemplateDebugUrl(template.id, apiKey);
  }

  return template.preview_url;
}

export function formatErrors(errors) {
  let formatted;

  if (Array.isArray(errors)) {
    formatted = errors.map((error) => `${error.status} ${error.title} — ${error.detail}`).join("\n");
  } else {
    formatted = Object.entries(errors)
      .map(([key, errorMessages]) => {
        return errorMessages.map((errorMessage) => `${attributeNames[key]}: ${errorMessage}`);
      })
      .flat()
      .join("\n");
  }

  return formatted;
}

// Update a template on PDFMonkey
//
// @param {string} templateId - The ID of the template to update
// @param {string} apiKey - The API key to use
// @param {object} template - The template to update
//
// @returns {Promise<object>} The updated template
export async function updateTemplate(templateId, apiKey, path) {
  const templateData = buildTemplateData(path);

  const url = `https://api.pdfmonkey.io/api/v1/document_templates/${templateId}`;
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const response = await fetch(url, { method: "PATCH", headers, body: templateData });
  const json = await response.json();

  if (json.errors) {
    return { success: false, errors: json.errors };
  }

  return { success: true, template: json.document_template };
}

// Fetch all workspaces from PDFMonkey
//
// @param {string} apiKey - The API key to use
//
// @returns {Promise<array>} The workspaces
export async function getWorkspaces(apiKey) {
  const url = "https://api.pdfmonkey.io/api/v1/workspace_cards";
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const response = await fetch(url, { headers });
  const json = await response.json();

  if (json.errors) {
    log.error(formatErrors(json.errors));
    return null;
  }

  return json.workspace_cards.sort((a, b) => a.identifier.toLowerCase().localeCompare(b.identifier.toLowerCase()));
}

// Fetch all templates from PDFMonkey for a specific workspace
//
// @param {string} workspaceId - The ID of the workspace
// @param {string} apiKey - The API key to use
//
// @returns {Promise<array>} The templates
export async function getTemplates(workspaceId, apiKey) {
  const url = `https://api.pdfmonkey.io/api/v1/document_template_cards?page=all&q[workspace_id]=${workspaceId}`;
  const headers = { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" };
  const response = await fetch(url, { headers });
  const json = await response.json();

  if (json.errors) {
    log.error(formatErrors(json.errors));
    return null;
  }

  const templates = json.document_template_cards.map((template) => {
    return {
      ...template,
      display_name: [template.template_folder_identifier, template.identifier].filter(Boolean).join(" / "),
    };
  });

  return templates.sort((a, b) => {
    const folderA = a.template_folder_identifier || "";
    const folderB = b.template_folder_identifier || "";

    if (folderA === "" && folderB !== "") return -1;
    if (folderA !== "" && folderB === "") return 1;

    const folderComparison = folderA.toLowerCase().localeCompare(folderB.toLowerCase());
    if (folderComparison !== 0) return folderComparison;

    return a.identifier.toLowerCase().localeCompare(b.identifier.toLowerCase());
  });
}
