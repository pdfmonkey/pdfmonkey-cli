import chalk from "chalk";
import { intro, outro, log } from "@clack/prompts";

import { getResourceId } from "../../utils/files.js";
import { gracefullyShutdownUponCtrlC } from "../../utils/term.js";
import { getSnippet, updateSnippet } from "../../utils/pdfmonkey.js";
import { handleConflict } from "../../utils/conflicts-handling.js";
import { formatErrors } from "../../utils/pdfmonkey.js";
import { watchFiles } from "../../utils/files-watching.js";

export default async function watchCommand(
  path,
  { apiKey, snippetId, wrapped = false, templateLiveReloadServer = null },
) {
  snippetId = getResourceId("snippet", snippetId, path);

  const introMessage = `Starting snippet sync for ${chalk.yellow(snippetId)}`;
  wrapped ? log.info(introMessage) : intro(introMessage);

  let snippet = await getSnippet(snippetId, apiKey);
  if (!snippet) {
    process.exit(1);
  }

  if (!(await handleConflicts(snippet, path))) {
    if (wrapped) {
      return;
    } else {
      outro("Shutting down");
      process.exit(0);
    }
  }

  watchFiles(path, async () => {
    let update = await updateSnippet(snippetId, apiKey, path);

    if (update.success) {
      if (templateLiveReloadServer) {
        templateLiveReloadServer.refresh("/");
        log.info("Template preview refreshed");
      }
    } else {
      update.errors = formatErrors(update.errors);
    }

    return update;
  });

  if (wrapped) {
    return {
      shutdownHandler: () => log.info("Shutting down snippet watcher"),
    };
  } else {
    gracefullyShutdownUponCtrlC(() => outro("Shutting down snp"));
  }
}

export async function handleConflicts(snippet, path) {
  const { code } = snippet;
  const updated_at = new Date(snippet.updated_at).toISOString();

  return await handleConflict(code, updated_at, path, "code.liquid");
}
