import {
  compact,
  confirmDestruction,
  formatDate,
  output,
  printDetails,
  printTable,
  resolveWorkspace,
} from "../../utils/cli.js";
import { hasMetadata, readFile, writeMetadata } from "../../utils/files.js";
import { getClient, getSnippets } from "../../utils/pdfmonkey.js";

export async function listCommand(options) {
  const workspaceId = await resolveWorkspace(options.workspace, options.apiKey);
  const snippets = await getSnippets(workspaceId, options.apiKey, options.search);

  // eslint-disable-next-line no-unused-vars
  const rows = snippets.map(({ code, display_name, sanitized_identifier, ...rest }) => rest);

  output(rows, options, () =>
    printTable(rows, [
      ["ID", (snippet) => snippet.id],
      ["NAME", (snippet) => snippet.identifier],
      ["UPDATED BY", (snippet) => snippet.updater_name],
      ["UPDATED", (snippet) => formatDate(snippet.updated_at)],
    ]),
  );
}

export async function getCommand(snippetId, options) {
  const snippet = await getClient(options.apiKey).snippets.get(snippetId);

  output(snippet, options, () => {
    printDetails([
      ["ID", snippet.id],
      ["Name", snippet.identifier],
      ["Workspace ID", snippet.workspace_id],
      ["Created", `${formatDate(snippet.created_at)} by ${snippet.creator_name}`],
      ["Updated", `${formatDate(snippet.updated_at)} by ${snippet.updater_name}`],
    ]);
    console.log(`\n${snippet.code ?? ""}`);
  });
}

export async function createCommand(options) {
  const { apiKey, name, from } = options;
  const workspaceId = await resolveWorkspace(options.workspace, apiKey);

  const snippet = await getClient(apiKey).snippets.create({
    workspace_id: workspaceId,
    identifier: name,
    code: from ? readFile(from, "code.liquid") : "",
  });

  // Link the local directory to the new snippet so it can be watched right away
  if (from && !hasMetadata(from)) {
    writeMetadata("snippet", snippet.id, from);
  }

  output(snippet, options, () => console.log(`Snippet ${snippet.identifier} created with ID ${snippet.id}`));
}

export async function updateCommand(snippetId, options) {
  const { apiKey, name, from } = options;
  const params = compact({ identifier: name, code: from && readFile(from, "code.liquid") });

  if (Object.keys(params).length === 0) {
    throw new Error("Nothing to update, see `pdfmonkey snippet update --help`.");
  }

  const snippet = await getClient(apiKey).snippets.update(snippetId, params);
  output(snippet, options, () => console.log(`Snippet ${snippet.identifier} updated`));
}

export async function deleteCommand(snippetId, options) {
  const client = getClient(options.apiKey);
  const snippet = await client.snippets.get(snippetId);

  await confirmDestruction(`Delete snippet ${snippet.identifier}?`, options.yes);
  await client.snippets.delete(snippetId);

  output({ id: snippetId, deleted: true }, options, () => console.log(`Snippet ${snippet.identifier} deleted`));
}
