import { APIError, PDFMonkey } from "pdfmonkey";
import { readFile, sanitizeIdentifier } from "./files.js";
import { attributeNames } from "./constants.js";
import packageConfig from "../../package.json" with { type: "json" };

const userAgent = `PDFMonkey CLI/${packageConfig.version}`;
let client;

// Returns the (memoized) PDFMonkey SDK client.
//
// @param {string} [apiKey] - The API key to use (default: PDFMONKEY_API_KEY environment variable)
//
// @returns {PDFMonkey} The client
export function getClient(apiKey) {
  client ??= new PDFMonkey({
    apiKey,
    baseURL: process.env.PDFMONKEY_API_BASE,
    // The SDK sets its own User-Agent, we want the CLI to be identifiable
    fetch: (url, init) => fetch(url, { ...init, headers: { ...init?.headers, "User-Agent": userAgent } }),
  });

  return client;
}

// Formats error objects into readable strings.
//
// @param {object|array} errors - Error object or array from API
//
// @returns {string} Formatted error message
function formatErrors(errors) {
  if (Array.isArray(errors)) {
    return errors.map((error) => `${error.status} ${error.title} — ${error.detail}`).join("\n");
  }

  return Object.entries(errors)
    .flatMap(([key, errorMessages]) => errorMessages.map((message) => `${attributeNames[key] ?? key}: ${message}`))
    .join("\n");
}

// Turns any error (API, network, local) into a readable message.
//
// @param {Error} error - The error to describe
//
// @returns {string} The message
export function describeError(error) {
  if (error instanceof APIError && error.body?.errors) {
    return formatErrors(error.body.errors);
  }

  return error.message;
}

// Gets a template from PDFMonkey API.
//
// @param {string} templateId - The ID of the template to get
// @param {string} apiKey - The API key to use
//
// @returns {Promise<object>} The template
export async function getTemplate(templateId, apiKey) {
  return getClient(apiKey).documentTemplates.get(templateId);
}

// Reads the template content from local files.
//
// @param {string} path - Path to the template directory
//
// @returns {object} The draft attributes of the template
export function readTemplateContent(path) {
  return {
    body_draft: readFile(path, "body.html.liquid"),
    scss_style_draft: readFile(path, "styles.scss"),
    sample_data_draft: readFile(path, "sample_data.json"),
  };
}

// Updates a template on PDFMonkey API.
//
// @param {string} templateId - The ID of the template to update
// @param {string} apiKey - The API key to use
// @param {string} path - The path to the template directory
//
// @returns {Promise<object>} The updated template
export async function updateTemplate(templateId, apiKey, path) {
  return getClient(apiKey).documentTemplates.update(templateId, readTemplateContent(path));
}

// Fetches all workspaces from PDFMonkey API.
//
// @param {string} apiKey - The API key to use
//
// @returns {Promise<array>} The workspaces, sorted by identifier
export async function getWorkspaces(apiKey) {
  const workspaces = await getClient(apiKey).workspaceCards.listAll();
  return workspaces.sort((a, b) => a.identifier.toLowerCase().localeCompare(b.identifier.toLowerCase()));
}

// Fetches a single template card from PDFMonkey API.
//
// There is no API endpoint for a single template card, so it is rebuilt from the template.
//
// @param {string} templateId - The ID of the template to fetch
// @param {string} apiKey - The API key to use
//
// @returns {Promise<object>} The processed template card
export async function getTemplateCard(templateId, apiKey) {
  const template = await getTemplate(templateId, apiKey);
  let template_folder_identifier = null;

  if (template.template_folder_id) {
    const folder = await getClient(apiKey).templateFolders.get(template.template_folder_id);
    template_folder_identifier = folder.identifier;
  }

  return buildTemplateCard({ ...template, template_folder_identifier });
}

// Fetches all template cards from PDFMonkey API.
//
// @param {string} [workspaceId] - The ID of the workspace (default: all workspaces)
// @param {string} apiKey - The API key to use
// @param {string} [folders] - Folder filter: folder IDs (comma separated) or "none"
//
// @returns {Promise<array>} The templates, sorted by folder and identifier
export async function getTemplateCards(workspaceId, apiKey, folders) {
  const templateCards = await getClient(apiKey).documentTemplates.listAll({ workspace_id: workspaceId, folders });
  const templates = templateCards.map((templateCard) => buildTemplateCard(templateCard));

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

// Adds sanitized identifiers to template card data.
//
// @param {object} templateCard - Template card data from API
//
// @returns {object} Template card with added sanitized identifiers and display name
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

// Fetches a single snippet from PDFMonkey API.
//
// @param {string} snippetId - The ID of the snippet to fetch
// @param {string} apiKey - The API key to use
//
// @returns {Promise<object>} The processed snippet
export async function getSnippet(snippetId, apiKey) {
  return buildSnippet(await getClient(apiKey).snippets.get(snippetId));
}

// Fetches all snippets from PDFMonkey API for a specific workspace.
//
// @param {string} workspaceId - The ID of the workspace
// @param {string} apiKey - The API key to use
// @param {string} [search] - Only return snippets whose identifier contains this string
//
// @returns {Promise<array>} The snippets, sorted by identifier
export async function getSnippets(workspaceId, apiKey, search) {
  const snippets = await getClient(apiKey).snippets.listAll({ workspace_id: workspaceId });

  // The SDK has no search filter, but all snippets are fetched anyway
  return snippets
    .filter((snippet) => !search || snippet.identifier.toLowerCase().includes(search.toLowerCase()))
    .map((snippet) => buildSnippet(snippet))
    .sort((a, b) => a.identifier.toLowerCase().localeCompare(b.identifier.toLowerCase()));
}

// Adds sanitized identifier to snippet data.
//
// @param {object} snippet - Snippet data from API
//
// @returns {object} Snippet with added sanitized identifier and display name
function buildSnippet(snippet) {
  const sanitized_identifier = sanitizeIdentifier(snippet.identifier);

  return {
    ...snippet,
    display_name: snippet.identifier,
    sanitized_identifier,
  };
}

// Updates a snippet on PDFMonkey API.
//
// @param {string} snippetId - The ID of the snippet to update
// @param {string} apiKey - The API key to use
// @param {string} path - The path to the snippet directory
//
// @returns {Promise<object>} The updated snippet
export async function updateSnippet(snippetId, apiKey, path) {
  return getClient(apiKey).snippets.update(snippetId, { code: readFile(path, "code.liquid") });
}
