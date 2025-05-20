import { intro, isCancel, outro, select } from "@clack/prompts";
import chalk from "chalk";

import { cancelOperation, gracefullyShutdownUponCtrlC } from "../../utils/term.js";
import snippetInitCommand from "../snippet/init.js";
import templateInitCommand from "../template/init.js";

export default async function initCommand({ apiKey, edit }) {
  intro("PDFMonkey Resources Initialization");

  gracefullyShutdownUponCtrlC(cancelOperation);

  let continueInitializing = true;

  while (continueInitializing) {
    const resourceType = await selectResourceType();

    if (resourceType === "exit") {
      continueInitializing = false;
      continue;
    }

    outro(`Initializing ${resourceType}...`);

    if (resourceType === "template") {
      await templateInitCommand(null, null, { apiKey, edit });
    } else if (resourceType === "snippet") {
      await snippetInitCommand(null, null, { apiKey, edit });
    }

    intro("PDFMonkey Resources Initialization");

    const shouldContinue = await select({
      message: "Do you want to initialize another resource?",
      options: [
        { value: true, label: "Yes, initialize another resource" },
        { value: false, label: "No, I'm done" },
      ],
    });

    if (isCancel(shouldContinue) || shouldContinue === false) {
      continueInitializing = false;
    }
  }

  outro("Initialization completed!");
}

async function selectResourceType() {
  const resourceType = await select({
    message: "What type of resource do you want to initialize?",
    options: [
      { value: "template", label: "Template" },
      { value: "snippet", label: "Snippet" },
      { value: "exit", label: chalk.red("Exit") },
    ],
  });

  if (isCancel(resourceType)) {
    cancelOperation();
  }

  return resourceType;
}
