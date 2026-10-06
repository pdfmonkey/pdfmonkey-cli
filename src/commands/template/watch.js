import chalk from "chalk";
import open from "open";
import { intro, outro, log } from "@clack/prompts";

import { getResourceId, TEMPLATE_FILES } from "../../utils/files.js";
import { gracefullyShutdownUponCtrlC } from "../../utils/term.js";
import { getClient, updateTemplate } from "../../utils/pdfmonkey.js";
import { handleConflict } from "../../utils/conflicts-handling.js";
import { startWebServer } from "../../utils/web-server.js";
import { watchFiles } from "../../utils/files-watching.js";

export default async function watchCommand(
  path,
  { apiKey, openBrowser, port, livereloadPort, templateId, wrapped = false },
) {
  templateId = getResourceId("template", templateId, path);

  const introMessage = `Starting template sync for ${chalk.yellow(templateId)}`;
  wrapped ? log.info(introMessage) : intro(introMessage);

  const template = await getClient(apiKey).documentTemplates.get(templateId);

  if (!(await handleConflicts(template, path))) {
    if (wrapped) {
      return;
    } else {
      outro("Shutting down");
      process.exit(0);
    }
  }

  let previewUrl = template.preview_url;

  const { server, liveReloadServer } = await startWebServer(port, livereloadPort, {
    templateId: () => template.id,
    previewUrl: () => previewUrl,
  });

  watchFiles(path, async () => {
    previewUrl = (await updateTemplate(templateId, apiKey, path)).preview_url;
    liveReloadServer.refresh("/");
  });

  if (openBrowser) {
    open(`http://localhost:${port}`);
  }

  const shutdownHandler = () => {
    liveReloadServer.close();
    server.close();
  };

  if (wrapped) {
    return {
      shutdownHandler: () => {
        log.info("Shutting down template watcher");
        shutdownHandler();
      },
      liveReloadServer,
    };
  } else {
    gracefullyShutdownUponCtrlC(() => {
      outro("Shutting down");
      shutdownHandler();
    });
  }
}

async function handleConflicts(template, path) {
  const updatedAt = new Date(template.updated_at).toISOString();

  for (const [attribute, filename] of Object.entries(TEMPLATE_FILES)) {
    if (!(await handleConflict(template[attribute], updatedAt, path, filename))) {
      return false;
    }
  }

  return true;
}
