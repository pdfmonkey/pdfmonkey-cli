import { log } from "@clack/prompts";
import { readFile, sanitizeIdentifier } from "./files.js";
import { attributeNames } from "./constants.js";

const baseUrl = "https://api.pdfmonkey.io/api/v1";

function buildHeaders(apiKey) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "User-Agent": "PDFMonkey CLI",
  };
}

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
  const url = `${baseUrl}/document_templates/${templateId}`;
  const headers = buildHeaders(apiKey);
  const response = await fetch(url, { headers });
  const json = await response.json();

  if (json.errors) {
    log.error(formatErrors(json.errors));
    return null;
  }

  return json.document_template;
}

export async function getTemplateDebugUrl(templateId, apiKey) {
  let url = `${baseUrl}/document_template_debugs/${templateId}`;
  let headers = buildHeaders(apiKey);
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

  const url = `${baseUrl}/document_templates/${templateId}`;
  const headers = buildHeaders(apiKey);
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
  const url = `${baseUrl}/workspace_cards`;
  const headers = buildHeaders(apiKey);
  const response = await fetch(url, { headers });
  const json = await response.json();

  if (json.errors) {
    log.error(formatErrors(json.errors));
    return null;
  }

  return json.workspace_cards.sort((a, b) => a.identifier.toLowerCase().localeCompare(b.identifier.toLowerCase()));
}

// Fetch a single template card from PDFMonkey
//
// @param {string} templateId - The ID of the template to fetch
// @param {string} apiKey - The API key to use
//
// @returns {Promise<object>} The template card
export async function getTemplateCard(templateId, apiKey) {
  const url = `${baseUrl}/document_template_cards/${templateId}`;
  const headers = buildHeaders(apiKey);
  const response = await fetch(url, { headers });
  const json = await response.json();

  if (json.errors) {
    log.error(formatErrors(json.errors));
    return null;
  }

  return buildTemplateCard(json.document_template_card);
}

// Fetch all template cards from PDFMonkey for a specific workspace
//
// @param {string} workspaceId - The ID of the workspace
// @param {string} apiKey - The API key to use
//
// @returns {Promise<array>} The templates
export async function getTemplateCards(workspaceId, apiKey) {
  const url = `${baseUrl}/document_template_cards?page=all&q[workspace_id]=${workspaceId}`;
  const headers = buildHeaders(apiKey);
  const response = await fetch(url, { headers });
  const json = await response.json();

  if (json.errors) {
    log.error(formatErrors(json.errors));
    return null;
  }

  const templates = json.document_template_cards.map((templateCard) => buildTemplateCard(templateCard));

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

function buildTemplateCard(templateCard) {
  const sanitized_identifier = sanitizeIdentifier(templateCard.identifier);
  const sanitized_folder_identifier = sanitizeIdentifier(templateCard.template_folder_identifier);

  return {
    ...templateCard,
    display_name: [templateCard.template_folder_identifier, templateCard.identifier].filter(Boolean).join(" / "),
    sanitized_identifier,
    sanitized_folder_identifier,
  };
}

// Fetch a single snippet from PDFMonkey
//
// @param {string} snippetId - The ID of the snippet to fetch
// @param {string} apiKey - The API key to use
//
// @returns {Promise<object>} The snippet
export async function getSnippet(snippetId, apiKey) {
  const url = `${baseUrl}/snippets/${snippetId}`;
  const headers = buildHeaders(apiKey);
  const response = await fetch(url, { headers });
  const json = await response.json();

  if (json.errors) {
    log.error(formatErrors(json.errors));
    return null;
  }

  return buildSnippet(json.snippet);
}

// Fetch all snippets from PDFMonkey for a specific workspace
//
// @param {string} workspaceId - The ID of the workspace
// @param {string} apiKey - The API key to use
//
// @returns {Promise<array>} The snippets
export async function getSnippets(workspaceId, apiKey) {
  const url = `${baseUrl}/snippets?page=all&q[workspace_id]=${workspaceId}`;
  const headers = buildHeaders(apiKey);
  const response = await fetch(url, { headers });
  const json = await response.json();

  if (json.errors) {
    log.error(formatErrors(json.errors));
    return null;
  }

  const snippets = json.snippets.map((snippet) => buildSnippet(snippet));

  return snippets.sort((a, b) => a.identifier.toLowerCase().localeCompare(b.identifier.toLowerCase()));
}

function buildSnippet(snippet) {
  const sanitized_identifier = sanitizeIdentifier(snippet.identifier);

  return {
    ...snippet,
    display_name: snippet.identifier,
    sanitized_identifier,
  };
}

// Update a snippet on PDFMonkey
//
// @param {string} snippetId - The ID of the snippet to update
// @param {string} apiKey - The API key to use
// @param {string} path - The path to the snippet folder
//
// @returns {Promise<object>} The updated snippet
export async function updateSnippet(snippetId, apiKey, path) {
  const code = readFile(path, "code.liquid");

  const url = `${baseUrl}/snippets/${snippetId}`;
  const headers = buildHeaders(apiKey);
  const body = JSON.stringify({ code });
  const response = await fetch(url, { method: "PATCH", headers, body });
  const json = await response.json();

  if (json.errors) {
    return { success: false, errors: json.errors };
  }

  return { success: true, snippet: json.snippet };
}
