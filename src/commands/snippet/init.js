import chalk from "chalk";
import nodePath from "path";
import { intro, isCancel, outro, select } from "@clack/prompts";

import { writeSnippetContent } from "../../utils/files.js";
import { getSnippet, getSnippets } from "../../utils/pdfmonkey.js";
import { cancelOperation } from "../../utils/term.js";
import { initResource } from "../shared/init.js";
import { pickWorkspace } from "../shared/workspace.js";

export default async function initCommand(snippetId, path, { apiKey, edit }) {
  return await initResource({
    id: snippetId,
    type: "snippet",
    path,
    edit,
    displayName: (snippet) => snippet.display_name,
    fetch: () => fetchSnippet(snippetId, apiKey),
    pathCandidates,
    write: writeSnippetContent,
  });
}

async function fetchSnippet(snippetId, apiKey) {
  let snippet = null;

  if (snippetId) {
    snippet = await getSnippet(snippetId, apiKey);
  } else {
    snippet = await runSnippetSelection(apiKey);
  }

  return snippet;
}

function pathCandidates(currentDir, snippet) {
  return [nodePath.join(currentDir, snippet.sanitized_identifier)];
}

async function pickSnippet(workspaceId, apiKey) {
  intro("Fetching snippets...");

  let selectedSnippet;
  const snippets = await getSnippets(workspaceId, apiKey);

  if (!snippets || snippets.length === 0) {
    outro("No snippets found");
    cancelOperation();
  }

  if (snippets.length === 1) {
    selectedSnippet = snippets[0];
  } else {
    selectedSnippet = await select({
      message: "Select a snippet",
      options: snippets.map((snippet) => ({
        value: snippet,
        label: snippet.display_name,
      })),
    });
  }

  if (isCancel(selectedSnippet)) {
    cancelOperation();
  }

  outro(`Using snippet: ${chalk.yellow(selectedSnippet.display_name)}`);

  return selectedSnippet;
}

async function runSnippetSelection(apiKey) {
  const workspaceId = await pickWorkspace(apiKey);
  const snippetInfo = await pickSnippet(workspaceId, apiKey);

  return snippetInfo;
}
