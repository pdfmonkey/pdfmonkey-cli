import { unlinkSync } from "fs";
import nodePath from "path";
import { execSync } from "child_process";
import { isCancel, log, select } from "@clack/prompts";

import { fileUpdatedAt, readFile, writeFile } from "./files.js";
import { fileToAttributeName } from "./constants.js";

// Handles conflicts between local and remote versions of a file.
//
// @param {string} remoteData - The content of the remote version
// @param {string} remoteUpdatedAt - When the remote version was last updated (ISO format)
// @param {string} path - The path to the local file directory
// @param {string} filename - The name of the file in conflict
//
// @returns {Promise<boolean>} True if conflict was resolved, false if operation was cancelled
export async function handleConflict(remoteData, remoteUpdatedAt, path, filename) {
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

// Shows differences between local file and remote content using system diff tools.
//
// @param {string} path - The directory path where the local file is located
// @param {string} filename - The name of the file to compare
// @param {string} remoteContent - The content from the remote version to compare against
//
// @returns {void}
// @private
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
