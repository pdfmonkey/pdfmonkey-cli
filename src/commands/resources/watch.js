import fs from "fs";
import chalk from "chalk";
import { confirm, intro, isCancel, log, outro, select, text } from "@clack/prompts";
import { cancelOperation, gracefullyShutdownUponCtrlC } from "../../utils/term.js";
import { getResourceMetadata } from "../../utils/files.js";
import templateWatchCommand from "../template/watch.js";
import snippetWatchCommand from "../snippet/watch.js";

export default async function watchCommand(paths, { apiKey, debug, openBrowser, port, livereloadPort }) {
  intro("PDFMonkey Watcher");

  const shutdownCallbacks = [];

  gracefullyShutdownUponCtrlC(async () => {
    shutdownCallbacks.forEach(async (callback) => await callback());
    outro("All watchers have been stopped");
    process.exit(0);
  });

  const currentDir = process.cwd();
  const resources = [];
  let templateFound = false;

  const handlePath = (path) => {
    const resource = loadResource(path, templateFound);

    if (resource) {
      templateFound ||= resource.isTemplate;
      resources.push(resource);
    }
  };

  if (paths?.length > 0) {
    paths.forEach((path) => handlePath(path));
  } else if (isResource(currentDir)) {
    handlePath(currentDir);
  } else {
    do {
      const path = await promptForPath();
      handlePath(path);
    } while (await continueAdding());
  }

  if (resources.length === 0) {
    outro("No folders to watch");
    process.exit(0);
  }

  log.info(`Watching ${resources.length} folder(s)...`);

  let templateLiveReloadServer = null;
  const template = resources.find((r) => r.isTemplate);

  if (template) {
    const templateResult = await templateWatchCommand(template.watchPath, {
      apiKey,
      debug,
      openBrowser,
      port,
      livereloadPort,
      wrapped: true,
    });

    if (templateResult && templateResult.shutdownHandler) {
      shutdownCallbacks.push(templateResult.shutdownHandler);

      if (templateResult.liveReloadServer) {
        templateLiveReloadServer = templateResult.liveReloadServer;
      }
    }
  }

  const snippetPromises = resources
    .filter(({ isTemplate }) => !isTemplate)
    .map(async ({ watchPath }) => {
      let shutdownHandler = await snippetWatchCommand(watchPath, {
        apiKey,
        wrapped: true,
        templateLiveReloadServer,
      });

      if (shutdownHandler) {
        shutdownCallbacks.push(shutdownHandler);
      }
    });

  try {
    await Promise.all(snippetPromises);
    // Keep running until Ctrl+C
  } catch (error) {
    log.error(`Error occurred: ${chalk.red(error.message)}`);
    process.exit(1);
  }
}

async function continueAdding() {
  return await confirm({
    message: `Do you want to add another folder to watch?`,
    initialValue: false,
  });
}

function isResource(path) {
  return fs.existsSync(`${path}/.pdfmonkey.json`);
}

function loadResource(path, templateFound) {
  log.info(`Loading path ${chalk.yellow(path)}`);

  if (!fs.existsSync(path)) {
    log.error(`Path ${chalk.red(path)} does not exist`);
    return;
  }

  if (!isResource(path)) {
    log.error(`No PDFMonkey metadata found in ${chalk.red(path)}`);
    return;
  }

  const metadata = getResourceMetadata(path);
  const isTemplate = metadata.type === "template";

  if (isTemplate && templateFound) {
    log.error("Error: Only one template can be watched at a time");
    log.error(`Skipping ${chalk.yellow(path)}`);
    return;
  }

  return { watchPath: path, isTemplate };
}

function findPDFMonkeyFolders() {
  const cwd = process.cwd();
  const foundFolders = [];

  const entries = fs.readdirSync(cwd, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const dirPath = `${cwd}/${entry.name}`;

      if (isResource(dirPath)) {
        foundFolders.push(dirPath);
      }

      const subEntries = fs.readdirSync(dirPath, { withFileTypes: true });

      for (const subEntry of subEntries) {
        if (subEntry.isDirectory()) {
          const subDirPath = `${dirPath}/${subEntry.name}`;

          if (isResource(subDirPath)) {
            foundFolders.push(subDirPath);
          }
        }
      }
    }
  }

  return foundFolders;
}

async function promptForPath() {
  const foundFolders = findPDFMonkeyFolders();
  let folderPath;

  if (foundFolders.length > 0) {
    const options = [
      ...foundFolders.sort().map((path) => ({ value: path, label: path })),
      { value: "custom", label: "Enter a custom path" },
    ];

    const selected = await select({
      message: "Select a PDFMonkey folder to watch",
      options: options,
    });

    if (isCancel(selected)) {
      cancelOperation();
    }

    if (selected === "custom") {
      folderPath = await text({
        message: "Enter a path to a template or snippet",
        placeholder: "./my-resource",
      });

      if (isCancel(folderPath)) {
        cancelOperation();
      }
    } else {
      folderPath = selected;
    }
  } else {
    folderPath = await text({
      message: "Enter a path to a template or snippet",
      placeholder: "./my-resource",
    });

    if (isCancel(folderPath)) {
      cancelOperation();
    }
  }

  if (!fs.existsSync(folderPath)) {
    log.error(`Path ${chalk.red(folderPath)} does not exist`);
    return null;
  }

  if (!isResource(folderPath)) {
    log.error(`No PDFMonkey metadata found in ${chalk.red(folderPath)}`);
    return null;
  }

  return folderPath;
}
