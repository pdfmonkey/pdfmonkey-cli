import fs from "fs";
import nodePath from "path";
import chalk from "chalk";
import { confirm, intro, isCancel, log, outro, select, text } from "@clack/prompts";
import { cancelOperation, gracefullyShutdownUponCtrlC } from "../../utils/term.js";
import { hasMetadata, readMetadata } from "../../utils/files.js";
import { describeError } from "../../utils/pdfmonkey.js";
import templateWatchCommand from "../template/watch.js";
import snippetWatchCommand from "../snippet/watch.js";

export default async function watchCommand(paths, { apiKey, openBrowser, port, livereloadPort }) {
  intro("PDFMonkey Watcher");

  let templateWatcher;

  gracefullyShutdownUponCtrlC(() => {
    templateWatcher?.shutdownHandler();
    outro("All watchers have been stopped");
  });

  const resources = await collectResources(paths);

  if (resources.length === 0) {
    outro("No directories to watch");
    process.exit(0);
  }

  log.info(`Watching ${resources.length} ${resources.length === 1 ? "directory" : "directories"}...`);

  const template = resources.find(({ isTemplate }) => isTemplate);
  const snippets = resources.filter(({ isTemplate }) => !isTemplate);

  // Already running watchers would keep the process alive, so failures exit explicitly
  try {
    if (template) {
      templateWatcher = await templateWatchCommand(template.path, {
        apiKey,
        openBrowser,
        port,
        livereloadPort,
        wrapped: true,
      });
    }

    // One at a time, conflicts may need to be resolved interactively
    for (const { path } of snippets) {
      await snippetWatchCommand(path, {
        apiKey,
        wrapped: true,
        templateLiveReloadServer: templateWatcher?.liveReloadServer,
      });
    }
  } catch (error) {
    log.error(describeError(error));
    process.exit(1);
  }
}

async function collectResources(paths) {
  const resources = [];

  const addPath = (path) => {
    const resource = loadResource(path, resources);

    if (resource) {
      resources.push(resource);
    }
  };

  if (paths.length > 0) {
    paths.forEach(addPath);
  } else if (hasMetadata(process.cwd())) {
    addPath(process.cwd());
  } else {
    do {
      addPath(await promptForPath());
    } while (await continueAdding());
  }

  return resources;
}

async function continueAdding() {
  const answer = await confirm({
    message: `Do you want to add another directory to watch?`,
    initialValue: false,
  });

  if (isCancel(answer)) {
    cancelOperation();
  }

  return answer;
}

function loadResource(path, resources) {
  log.info(`Loading path ${chalk.yellow(path)}`);

  if (!fs.existsSync(path)) {
    log.error(`Path ${chalk.red(path)} does not exist`);
    return;
  }

  if (!hasMetadata(path)) {
    log.error(`No PDFMonkey metadata found in ${chalk.red(path)}`);
    return;
  }

  const isTemplate = readMetadata(path).type === "template";

  if (isTemplate && resources.some((resource) => resource.isTemplate)) {
    log.error("Error: Only one template can be watched at a time");
    log.error(`Skipping ${chalk.yellow(path)}`);
    return;
  }

  return { path, isTemplate };
}

// Finds the resource directories up to two levels below the current directory.
function findResourceDirectories() {
  const subdirectories = (dir) =>
    fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => nodePath.join(dir, entry.name));

  return subdirectories(process.cwd())
    .flatMap((dir) => [dir, ...subdirectories(dir)])
    .filter(hasMetadata)
    .sort();
}

async function promptForPath() {
  const directories = findResourceDirectories();
  let path = "custom";

  if (directories.length > 0) {
    path = await select({
      message: "Select a PDFMonkey directory to watch",
      options: [
        ...directories.map((directory) => ({ value: directory, label: directory })),
        { value: "custom", label: "Enter a custom path" },
      ],
    });
  }

  if (path === "custom") {
    path = await text({ message: "Enter a path to a template or snippet", placeholder: "./my-resource" });
  }

  if (isCancel(path)) {
    cancelOperation();
  }

  return path;
}
