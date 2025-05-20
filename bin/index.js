#!/usr/bin/env node

import { program } from "commander";

import { templateInitCommand, templateWatchCommand } from "../src/commands/template.js";
import { snippetInitCommand, snippetWatchCommand } from "../src/commands/snippet.js";
import { resourcesInitCommand, resourcesWatchCommand } from "../src/commands/resources.js";
import packageConfig from "../package.json" with { type: "json" };

const authArgs = [
  "-k, --api-key <key>",
  "The API key to use (default: PDFMONKEY_API_KEY environment variable)",
  process.env.PDFMONKEY_API_KEY,
];

const portArgs = [
  "-p, --port <port>",
  "The port to run the server on (default: 2081 or PORT environment variable)",
  process.env.PORT || 2081,
];

const livereloadPortArgs = [
  "-l, --livereload-port <port>",
  "Livereload port (default: 2082 or LIVE_RELOAD_PORT environment variable)",
  process.env.LIVE_RELOAD_PORT || 2082,
];

program
  .version(packageConfig.version)
  .description("A CLI tool to edit your PDFMonkey templates locally with your own code editor.");

////////////////////////////////////////////////////////////////////////////////
// Global commands                                                          //
////////////////////////////////////////////////////////////////////////////////

program
  .command("init")
  .description("Initialize multiple PDFMonkey resources in sequence")
  .option("-e, --edit", "Opens initialized resources in your default editor (based on EDITOR environment variable)")
  .option(...authArgs)
  .action(resourcesInitCommand);

program
  .command("watch")
  .description("Watch PDFMonkey template and snippets simultaneously")
  .argument("[paths...]", "Paths to watch (default: interactively select paths)")
  .option("-D, --debug", "Display an HTML debug preview instead of the PDF preview for templates")
  .option("-o, --open-browser", "Open the template in the default browser")
  .option(...portArgs)
  .option(...livereloadPortArgs)
  .option(...authArgs)
  .action(resourcesWatchCommand);

////////////////////////////////////////////////////////////////////////////////
// Template commands                                                          //
////////////////////////////////////////////////////////////////////////////////

const templateCommand = program.command("template").aliases(["tpl"]).description("Manage PDFMonkey templates");

templateCommand
  .command("init")
  .description("Initialize a PDFMonkey template folder")
  .argument("[templateId]", "The ID of the template to use")
  .argument("[path]", "The path to the template folder (default: ID of the template in current folder)")
  .option("-e, --edit", "Opens the template folder in your default editor (based on EDITOR environment variable)")
  .option(...authArgs)
  .action(templateInitCommand);

templateCommand
  .command("watch")
  .description("Watch the current folder for changes and update the PDFMonkey template")
  .argument("[path]", "The path to the template folder (default: current folder)", process.cwd())
  .option("-D, --debug", "Display an HTML debug preview instead of the PDF preview")
  .option("-o, --open-browser", "Open the template in the default browser")
  .option(...portArgs)
  .option(...livereloadPortArgs)
  .option("-t, --template-id <templateId>", "The ID of the template to use (default: current folder name)")
  .option(...authArgs)
  .action(templateWatchCommand);

////////////////////////////////////////////////////////////////////////////////
// Snippet commands                                                           //
////////////////////////////////////////////////////////////////////////////////

const snippetCommand = program.command("snippet").aliases(["snp"]).description("Manage PDFMonkey snippets");

snippetCommand
  .command("init")
  .description("Initialize a PDFMonkey snippet file")
  .argument("[snippetId]", "The ID of the snippet to use")
  .argument("[path]", "The path to the snippet file (default: ID of the snippet in current folder)")
  .option("-e, --edit", "Opens the snippet file in your default editor (based on EDITOR environment variable)")
  .option(...authArgs)
  .action(snippetInitCommand);

snippetCommand
  .command("watch")
  .description("Watch the current folder for changes and update the PDFMonkey snippet")
  .argument("[path]", "The path to the snippet folder (default: current folder)", process.cwd())
  .option("-s, --snippet-id <snippetId>", "The ID of the snippet to use (default: current folder name)")
  .option(...authArgs)
  .action(snippetWatchCommand);

program.parse(process.argv);
