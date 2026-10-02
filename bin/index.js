#!/usr/bin/env node

import { Option, program } from "commander";

import { templateInitCommand, templateWatchCommand } from "../src/commands/template.js";
import { snippetInitCommand, snippetWatchCommand } from "../src/commands/snippet.js";
import { resourcesInitCommand, resourcesWatchCommand } from "../src/commands/resources.js";
import * as template from "../src/commands/template/manage.js";
import * as folder from "../src/commands/folder.js";
import { whoamiCommand, workspaceListCommand } from "../src/commands/account.js";
import { run } from "../src/utils/cli.js";
import packageConfig from "../package.json" with { type: "json" };

// No default value here: commander would print the API key in the help output
const authArgs = ["-k, --api-key <key>", "The API key to use (default: PDFMONKEY_API_KEY environment variable)"];

const jsonArgs = ["--json", "Output raw JSON (handy for scripts and LLMs)"];

const yesArgs = ["-y, --yes", "Skip the confirmation prompt"];

const workspaceArgs = [
  "-w, --workspace <id|name>",
  "The workspace ID or name (default: PDFMONKEY_WORKSPACE environment variable)",
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
  .name("pdfmonkey")
  .version(packageConfig.version)
  .description("A CLI tool to manage your PDFMonkey templates, snippets and documents.");

////////////////////////////////////////////////////////////////////////////////
// Global commands                                                            //
////////////////////////////////////////////////////////////////////////////////

program
  .command("init")
  .description("Initialize multiple PDFMonkey resources in sequence")
  .option("-e, --edit", "Opens initialized resources in your default editor (based on EDITOR environment variable)")
  .option(...authArgs)
  .action(run(resourcesInitCommand));

program
  .command("watch")
  .description("Watch PDFMonkey template and snippets simultaneously")
  .argument("[paths...]", "Paths to watch (default: interactively select paths)")
  .option("-D, --debug", "Display an HTML debug preview instead of the PDF preview for templates")
  .option("-o, --open-browser", "Open the template in the default browser")
  .option(...portArgs)
  .option(...livereloadPortArgs)
  .option(...authArgs)
  .action(run(resourcesWatchCommand));

program
  .command("whoami")
  .description("Show the account the API key belongs to")
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(whoamiCommand));

////////////////////////////////////////////////////////////////////////////////
// Workspace commands                                                         //
////////////////////////////////////////////////////////////////////////////////

const workspaceCommand = program.command("workspace").aliases(["ws"]).description("Manage PDFMonkey workspaces");

workspaceCommand
  .command("list")
  .alias("ls")
  .description("List workspaces")
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(workspaceListCommand));

////////////////////////////////////////////////////////////////////////////////
// Template commands                                                          //
////////////////////////////////////////////////////////////////////////////////

const templateCommand = program.command("template").aliases(["tpl"]).description("Manage PDFMonkey templates");

templateCommand
  .command("list")
  .alias("ls")
  .description("List templates (default: across all workspaces)")
  .option(...workspaceArgs)
  .option("-f, --folder <id|name|none>", "Only list templates of this folder, or outside of any folder with none")
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(template.listCommand));

templateCommand
  .command("get")
  .alias("show")
  .description("Show a template (use --json to get its full content)")
  .argument("<templateId>", "The ID of the template")
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(template.getCommand));

templateCommand
  .command("create")
  .description("Create a template")
  .requiredOption("-n, --name <name>", "The name of the template")
  .option(...workspaceArgs)
  .option("-f, --folder <id|name>", "The folder to put the template in")
  .addOption(new Option("-m, --mode <mode>", "The edition mode").choices(["code", "builder"]).default("code"))
  .addOption(new Option("--output-type <type>", "The type of file to generate").choices(["pdf", "image"]))
  .option("--engine <name>", "The PDF engine to use, e.g. v5 (default: latest)")
  .option(
    "--from <path>",
    "A template folder to read the content from (body.html.liquid, styles.scss, sample_data.json)",
  )
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(template.createCommand));

templateCommand
  .command("update")
  .description("Update a template draft, use publish to make the changes live")
  .argument("<templateId>", "The ID of the template")
  .option("-n, --name <name>", "The new name of the template")
  .option("-f, --folder <id|name|none>", "Move the template to this folder, or out of any folder with none")
  .option(...workspaceArgs)
  .addOption(new Option("--output-type <type>", "The type of file to generate").choices(["pdf", "image"]))
  .option("--engine <name>", "The PDF engine to use, e.g. v5")
  .option(
    "--from <path>",
    "A template folder to read the content from (body.html.liquid, styles.scss, sample_data.json)",
  )
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(template.updateCommand));

templateCommand
  .command("publish")
  .description("Publish the draft of a template")
  .argument("<templateId>", "The ID of the template")
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(template.publishCommand));

templateCommand
  .command("delete")
  .alias("rm")
  .description("Delete a template")
  .argument("<templateId>", "The ID of the template")
  .option(...yesArgs)
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(template.deleteCommand));

templateCommand
  .command("init")
  .description("Initialize a PDFMonkey template folder")
  .argument("[templateId]", "The ID of the template to use")
  .argument("[path]", "The path to the template folder (default: ID of the template in current folder)")
  .option("-e, --edit", "Opens the template folder in your default editor (based on EDITOR environment variable)")
  .option(...authArgs)
  .action(run(templateInitCommand));

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
  .action(run(templateWatchCommand));

////////////////////////////////////////////////////////////////////////////////
// Folder commands                                                            //
////////////////////////////////////////////////////////////////////////////////

const folderCommand = program.command("folder").aliases(["fld"]).description("Manage PDFMonkey template folders");

folderCommand
  .command("list")
  .alias("ls")
  .description("List the template folders of a workspace")
  .option(...workspaceArgs)
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(folder.listCommand));

folderCommand
  .command("create")
  .description("Create a template folder")
  .requiredOption("-n, --name <name>", "The name of the folder")
  .option(...workspaceArgs)
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(folder.createCommand));

folderCommand
  .command("rename")
  .description("Rename a template folder")
  .argument("<folderId>", "The ID of the folder")
  .argument("<name>", "The new name of the folder")
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(folder.renameCommand));

folderCommand
  .command("delete")
  .alias("rm")
  .description("Delete a template folder")
  .argument("<folderId>", "The ID of the folder")
  .option(...yesArgs)
  .option(...jsonArgs)
  .option(...authArgs)
  .action(run(folder.deleteCommand));

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
  .action(run(snippetInitCommand));

snippetCommand
  .command("watch")
  .description("Watch the current folder for changes and update the PDFMonkey snippet")
  .argument("[path]", "The path to the snippet folder (default: current folder)", process.cwd())
  .option("-s, --snippet-id <snippetId>", "The ID of the snippet to use (default: current folder name)")
  .option(...authArgs)
  .action(run(snippetWatchCommand));

program.parse(process.argv);
