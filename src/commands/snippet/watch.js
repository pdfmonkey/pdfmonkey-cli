import chalk from "chalk";
import { intro, outro } from "@clack/prompts";

import { gracefullyShutdownUponCtrlC } from "../../utils/term.js";
import { getSnippet, updateSnippet } from "../../utils/pdfmonkey.js";
import { formatErrors } from "../../utils/pdfmonkey.js";
import { watchFiles } from "../../utils/files-watching.js";

export default async function watchCommand(path, { apiKey, snippetId }) {
  snippetId ??= path.split("/").pop();

  intro(`Starting snippet sync for ${chalk.yellow(snippetId)}`);

  let snippet = await getSnippet(snippetId, apiKey);
  if (!snippet) {
    process.exit(1);
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
