import { sanitizeIdentifier, writeSnippetContent } from "../../utils/files.js";
import { getClient, getSnippets } from "../../utils/pdfmonkey.js";
import { initResource } from "../shared/init.js";
import { pickOne, pickWorkspace } from "../shared/pick.js";

export default async function initCommand(snippetId, path, { apiKey, edit }) {
  const snippet = snippetId ? await getClient(apiKey).snippets.get(snippetId) : await pickSnippet(apiKey);

  return await initResource({
    type: "snippet",
    resource: snippet,
    label: snippet.identifier,
    path,
    edit,
    pathCandidates: [sanitizeIdentifier(snippet.identifier)],
    write: writeSnippetContent,
  });
}

async function pickSnippet(apiKey) {
  const workspaceId = await pickWorkspace(apiKey);
  return pickOne("snippet", () => getSnippets(workspaceId, apiKey));
}
