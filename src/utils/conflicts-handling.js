import { unlinkSync } from "fs";
import nodePath from "path";
import { execSync } from "child_process";
import { isCancel, log, select } from "@clack/prompts";

import { fileUpdatedAt, readFile, writeFile } from "./files.js";
import { fileToAttributeName } from "./constants.js";

async function handleConflict(remoteData, remoteUpdatedAt, path, filename) {
  const localData = readFile(path, filename);
  const localUpdatedAt = fileUpdatedAt(path, filename);
  const attributeName = fileToAttributeName[filename];
  let choice = undefined;

  if ((remoteData ?? "") === (localData ?? "")) {
    return true;
  }

  log.warn(
    `Conflict detected for ${attributeName}\n` +
      `Remote content updated at ${remoteUpdatedAt}\n` +
      `Local content updated at ${localUpdatedAt}`,
  );

  while (true) {
    choice = await select({
      message: "What content do you want to keep?",
      options: [
        { value: "remote", label: "Remote content" },
        { value: "local", label: "Local content" },
        { value: "diff", label: "See what changed" },
      ],
    });

    if (isCancel(choice)) {
      return false;
    }

    if (choice === "local") {
      log.info(`Using local content for ${attributeName}`);
      return true;
    }

    if (choice === "remote") {
      writeFile(path, filename, remoteData);
      log.info(`Using remote content for ${attributeName}`);
      return true;
    }

    if (choice === "diff") {
      showDiff(path, filename, remoteData);
    }
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

function showDiff(path, filename, remoteContent) {
  const diffTool = process.env.DIFF ?? "diff -u";
  const pager = process.env.PAGER ?? "less";

  const remoteFilename = `.remote-${filename}`;
  const remoteFile = nodePath.join(path, remoteFilename);
  const localFile = nodePath.join(path, filename);

  try {
    writeFile(path, remoteFilename, remoteContent);
    execSync(`${diffTool} ${localFile} ${remoteFile} | ${pager}`, { stdio: "inherit" });
  } catch (error) {
    log.error(`Error displaying the diff: ${error.message}`);
  } finally {
    unlinkSync(remoteFile);
  }
}
