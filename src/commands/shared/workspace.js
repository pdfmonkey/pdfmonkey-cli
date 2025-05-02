import chalk from "chalk";
import { intro, isCancel, outro, select } from "@clack/prompts";

import { cancelOperation } from "../../utils/term.js";
import { getWorkspaces } from "../../utils/pdfmonkey.js";

// Pick a workspace from PDFMonkey
//
// @param {string} apiKey - The API key to use
//
// @returns {Promise<string>} The workspace ID
export async function pickWorkspace(apiKey) {
  intro("Fetching workspaces...");

  let selectedWorkspace;
  const workspaces = await getWorkspaces(apiKey);

  if (!workspaces || workspaces.length === 0) {
    outro("No workspaces found");
    cancelOperation();
  }

  if (workspaces.length === 1) {
    selectedWorkspace = workspaces[0];
  } else {
    selectedWorkspace = await select({
      message: "Select a workspace",
      options: workspaces.map((workspace) => ({
        value: workspace,
        label: workspace.identifier,
      })),
    });
  }

  if (isCancel(selectedWorkspace)) {
    cancelOperation();
  }

  outro(`Using workspace: ${chalk.yellow(selectedWorkspace.identifier)}`);

  return selectedWorkspace.id;
}
