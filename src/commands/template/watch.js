import chalk from "chalk";
import open from "open";
import { intro, outro, log } from "@clack/prompts";

import { getResourceId } from "../../utils/files.js";
import { gracefullyShutdownUponCtrlC } from "../../utils/term.js";
import { getTemplate, updateTemplate, getTemplatePreviewUrl } from "../../utils/pdfmonkey.js";
import { handleConflict } from "../../utils/conflicts-handling.js";
import { formatErrors } from "../../utils/pdfmonkey.js";
import { startWebServer } from "../../utils/web-server.js";
import { watchFiles } from "../../utils/files-watching.js";

export default async function watchCommand(
  path,
  { apiKey, debug, openBrowser, port, livereloadPort, templateId, wrapped = false },
) {
  templateId = getResourceId("template", templateId, path);

  const introMessage = `Starting template sync for ${chalk.yellow(templateId)}`;
  wrapped ? log.info(introMessage) : intro(introMessage);

  let template = await getTemplate(templateId, apiKey);
  if (!template) {
    process.exit(1);
  }

  if (!(await handleConflicts(template, path))) {
    if (wrapped) {
      return;
    } else {
      outro("Shutting down");
      process.exit(0);
    }
  }

  let previewUrl = await getTemplatePreviewUrl(template, apiKey, debug);

  const { server, liveReloadServer } = await startWebServer(port, livereloadPort, {
    templateId: () => template.id,
    previewUrl: () => previewUrl,
  });

  watchFiles(path, async () => {
    let update = await updateTemplate(templateId, apiKey, path);

    if (update.success) {
      previewUrl = await getTemplatePreviewUrl(update.template, apiKey, debug);
      liveReloadServer.refresh("/");
    } else {
      update.errors = formatErrors(update.errors);
    }

    return update;
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

export async function handleConflicts(template, path) {
  const { body_draft, scss_style_draft, sample_data_draft } = template;
  const updated_at = new Date(template.updated_at).toISOString();
  let conflictHandled;

  conflictHandled = await handleConflict(body_draft, updated_at, path, "body.html.liquid");
  if (!conflictHandled) {
    return false;
  }

  conflictHandled = await handleConflict(scss_style_draft, updated_at, path, "styles.scss");
  if (!conflictHandled) {
    return false;
  }

  conflictHandled = await handleConflict(sample_data_draft, updated_at, path, "sample_data.json");
  if (!conflictHandled) {
    return false;
  }

  return true;
}
