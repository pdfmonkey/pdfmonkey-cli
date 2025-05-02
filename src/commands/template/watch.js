import chalk from "chalk";
import open from "open";
import { intro, outro } from "@clack/prompts";

import { gracefullyShutdownUponCtrlC } from "../../utils/term.js";
import { getTemplate, updateTemplate, getTemplatePreviewUrl } from "../../utils/pdfmonkey.js";
import { handleConflicts } from "../../utils/conflicts-handling.js";
import { formatErrors } from "../../utils/pdfmonkey.js";
import { startWebServer } from "../../utils/web-server.js";
import { watchFiles } from "../../utils/files-watching.js";

export default async function watchCommand(path, { apiKey, debug, openBrowser, port, livereloadPort, templateId }) {
  templateId ??= path.split("/").pop();

  intro(`Starting template sync for ${chalk.yellow(templateId)}`);

  let template = await getTemplate(templateId, apiKey);
  if (!template) {
    process.exit(1);
  }

  if (!(await handleConflicts(template, path))) {
    outro("Shutting down");
    process.exit(0);
  }

  let previewUrl = await getTemplatePreviewUrl(template, apiKey, debug);

  const { server, liveReloadServer } = startWebServer(port, livereloadPort, {
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

  gracefullyShutdownUponCtrlC(() => {
    outro("Shutting down");
    liveReloadServer.close();
    server.close();
  });
}
