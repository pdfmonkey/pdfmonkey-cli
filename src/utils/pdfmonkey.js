import { APIError, PDFMonkey } from "pdfmonkey";
import { readFile, readTemplateContent } from "./files.js";
import packageConfig from "../../package.json" with { type: "json" };

const userAgent = `PDFMonkey CLI/${packageConfig.version}`;
const collator = new Intl.Collator(undefined, { sensitivity: "base" });

// Human-readable names of the attributes the API reports errors on.
const attributeNames = {
  body_draft: "HTML",
  code: "Code",
  scss_style_draft: "CSS",
  sample_data_draft: "Sample Data",
  settings_draft: "Settings",
};
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

// Sorts API items by identifier, ignoring case.
//
// @example items.sort(byIdentifier)
export function byIdentifier(a, b) {
  return collator.compare(a.identifier, b.identifier);
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
  return workspaces.sort(byIdentifier);
}

// Fetches a template along with the name of its folder, like template cards have.
//
// @param {string} templateId - The ID of the template to fetch
// @param {string} apiKey - The API key to use
//
// @returns {Promise<object>} The template, with its template_folder_identifier
export async function getTemplateWithFolder(templateId, apiKey) {
  const client = getClient(apiKey);
  const template = await client.documentTemplates.get(templateId);
  const folder = template.template_folder_id && (await client.templateFolders.get(template.template_folder_id));

  return { ...template, template_folder_identifier: folder?.identifier ?? null };
}

// Fetches all template cards from PDFMonkey API.
//
// @param {string} [workspaceId] - The ID of the workspace (default: all workspaces)
// @param {string} apiKey - The API key to use
// @param {string} [folders] - Folder filter: folder IDs (comma separated) or "none"
//
// @returns {Promise<array>} The templates, sorted by folder and identifier
export async function getTemplateCards(workspaceId, apiKey, folders) {
  const templates = await getClient(apiKey).documentTemplates.listAll({ workspace_id: workspaceId, folders });

  // Templates outside of any folder first
  return templates.sort(
    (a, b) =>
      Boolean(a.template_folder_identifier) - Boolean(b.template_folder_identifier) ||
      collator.compare(a.template_folder_identifier ?? "", b.template_folder_identifier ?? "") ||
      byIdentifier(a, b),
  );
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
    .sort(byIdentifier);
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
