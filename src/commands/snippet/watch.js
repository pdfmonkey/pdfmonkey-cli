import chalk from "chalk";
import { intro, outro } from "@clack/prompts";

import { getResourceId } from "../../utils/files.js";
import { gracefullyShutdownUponCtrlC } from "../../utils/term.js";
import { getSnippet, updateSnippet } from "../../utils/pdfmonkey.js";
import { handleConflict } from "../../utils/conflicts-handling.js";
import { formatErrors } from "../../utils/pdfmonkey.js";
import { watchFiles } from "../../utils/files-watching.js";

export default async function watchCommand(path, { apiKey, snippetId }) {
  snippetId = getResourceId("snippet", snippetId, path);

  intro(`Starting snippet sync for ${chalk.yellow(snippetId)}`);

  let snippet = await getSnippet(snippetId, apiKey);
  if (!snippet) {
    process.exit(1);
  }

  if (!(await handleConflicts(snippet, path))) {
    outro("Shutting down");
    process.exit(0);
  }

  watchFiles(path, async () => {
    let update = await updateSnippet(snippetId, apiKey, path);

    if (!update.success) {
      update.errors = formatErrors(update.errors);
    }

    return update;
  });

  gracefullyShutdownUponCtrlC(() => {
    outro("Shutting down");
  });
}

export async function handleConflicts(snippet, path) {
  const { code } = snippet;
  const updated_at = new Date(snippet.updated_at).toISOString();

  return await handleConflict(code, updated_at, path, "code.liquid");
}
