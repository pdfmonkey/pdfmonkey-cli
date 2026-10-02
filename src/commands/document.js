import fs from "fs";
import nodePath from "path";

import {
  compact,
  confirmDestruction,
  formatDate,
  output,
  parseTimestamp,
  printDetails,
  printTable,
  readJsonInput,
  resolveWorkspace,
} from "../utils/cli.js";
import { getClient, listPage } from "../utils/pdfmonkey.js";

export async function listCommand(options) {
  const { apiKey, template, status, search, page, perPage } = options;
  const workspaceId = await resolveWorkspace(options.workspace, apiKey, { required: false });

  const filters = compact({
    workspace_id: workspaceId,
    document_template_id: template,
    status,
    search,
    updated_since: parseTimestamp(options.updatedSince),
  });

  const result = await listPage("/document_cards", "document_cards", filters, { page, perPage }, apiKey);

  output(result, options, ({ items, meta }) => {
    printTable(items, [
      ["ID", (document) => document.id],
      ["STATUS", (document) => document.status],
      ["TEMPLATE", (document) => document.document_template_identifier],
      ["FILENAME", (document) => document.filename],
      ["CREATED", (document) => formatDate(document.created_at)],
    ]);

    if (meta.total_pages > 1) {
      console.log(`\nPage ${meta.current_page}/${meta.total_pages}, use --page to see more`);
    }
  });
}

export async function getCommand(documentId, options) {
  const document = await getClient(options.apiKey).documents.get(documentId);
  output(document, options, printDocument);
}

export async function createCommand(options) {
  const document = await getClient(options.apiKey).documents.create(
    compact({
      document_template_id: options.template,
      payload: readJsonInput(options.payload),
      meta: readJsonInput(options.meta),
      status: options.draft ? "draft" : "pending",
    }),
  );

  await handleGeneration(document, options);
}

export async function updateCommand(documentId, options) {
  const params = compact({
    payload: readJsonInput(options.payload),
    meta: readJsonInput(options.meta),
    status: options.generate ? "pending" : undefined,
  });

  if (Object.keys(params).length === 0) {
    throw new Error("Nothing to update, see `pdfmonkey document update --help`.");
  }

  const document = await getClient(options.apiKey).documents.update(documentId, params);
  await handleGeneration(document, options);
}

export async function downloadCommand(documentId, path, options) {
  const client = getClient(options.apiKey);
  const card = await client.documentCards.get(documentId);
  const filePath = await download(card, path, options.apiKey);

  output({ ...card, path: filePath }, options, () => console.log(`Document saved to ${filePath}`));
}

export async function deleteCommand(documentId, options) {
  await confirmDestruction(`Delete document ${documentId}?`, options.yes);
  await getClient(options.apiKey).documents.delete(documentId);

  output({ id: documentId, deleted: true }, options, () => console.log(`Document ${documentId} deleted`));
}

// Waits for the generation and downloads the file when requested, then prints the document.
async function handleGeneration(document, options) {
  const { apiKey, wait, output: path } = options;
  const generating = document.status === "pending" || document.status === "generating";

  if (generating && (wait || path)) {
    document = await getClient(apiKey).documents.waitForGeneration(document.id);
  }

  let filePath;
  if (path) {
    filePath = await download(document, path, apiKey);
  }

  output(compact({ ...document, path: filePath }), options, () => {
    printDocument(document);

    if (filePath) {
      console.log(`\nDocument saved to ${filePath}`);
    }
  });
}

async function download(document, path = ".", apiKey) {
  const content = await getClient(apiKey).documents.download(document);
  const filename = document.filename ?? `${document.id}.${document.output_type === "image" ? "png" : "pdf"}`;
  const filePath = fs.existsSync(path) && fs.statSync(path).isDirectory() ? nodePath.join(path, filename) : path;

  fs.writeFileSync(filePath, content);

  return filePath;
}

function printDocument(document) {
  printDetails([
    ["ID", document.id],
    ["Status", document.status],
    ["Template ID", document.document_template_id],
    ["Workspace ID", document.app_id],
    ["Filename", document.filename],
    ["Failure cause", document.failure_cause],
    ["Created", formatDate(document.created_at)],
    ["Updated", formatDate(document.updated_at)],
    ["Download URL", document.download_url],
    ["Preview URL", document.preview_url],
  ]);
}
