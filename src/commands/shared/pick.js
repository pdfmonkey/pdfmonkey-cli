import chalk from "chalk";
import { intro, isCancel, outro, select } from "@clack/prompts";

import { cancelOperation } from "../../utils/term.js";
import { getWorkspaces } from "../../utils/pdfmonkey.js";

// Lets the user pick an item, picking it automatically when it is the only one.
//
// @param {string} noun - What is picked, e.g. "workspace"
// @param {Function} fetchItems - Returns the items to pick from
// @param {Function} [label] - Returns the label of an item (default: its identifier)
//
// @returns {Promise<object>} The picked item
export async function pickOne(noun, fetchItems, label = (item) => item.identifier) {
  intro(`Fetching ${noun}s...`);

  const items = await fetchItems();

  if (items.length === 0) {
    outro(`No ${noun}s found`);
    cancelOperation();
  }

  const picked =
    items.length === 1
      ? items[0]
      : await select({
          message: `Select a ${noun}`,
          options: items.map((item) => ({ value: item, label: label(item) })),
        });

  if (isCancel(picked)) {
    cancelOperation();
  }

  outro(`Using ${noun}: ${chalk.yellow(label(picked))}`);

  return picked;
}

// Pick a workspace from PDFMonkey
//
// @param {string} apiKey - The API key to use
//
// @returns {Promise<string>} The workspace ID
export async function pickWorkspace(apiKey) {
  const workspace = await pickOne("workspace", () => getWorkspaces(apiKey));
  return workspace.id;
}
