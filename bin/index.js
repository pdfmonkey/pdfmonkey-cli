#!/usr/bin/env node
/* eslint-disable prettier/prettier */

import { program } from "commander";

import initCommand from "../src/commands/init.js";
import watchCommand from "../src/commands/watch.js";

program
  .version("0.1.0")
  .description("A CLI tool to edit your PDFMonkey template locally with your own code editor.");

program
  .command("init")
  .description("Initialize a PDFMonkey template folder")
  .argument("<templateId>", "The ID of the template to use")
  .argument("[path]", "The path to the template folder (default: ID of the template in current folder)")
  .option("-e, --edit", "Opens the template folder in your default editor (based on EDITOR environment variable)")
  .option("-k, --api-key <key>", "The API key to use (default: PDFMONKEY_API_KEY environment variable)", process.env.PDFMONKEY_API_KEY)
  .action(initCommand);

program
  .command("watch")
  .description("Watch the current folder for changes and update the PDFMonkey template")
  .argument("[path]", "The path to the template folder (default: current folder)", process.cwd())
  .option('-D, --debug', 'Display an HTML debug preview instead of the PDF preview')
  .option("-k, --api-key <key>", "The API key to use (default: PDFMONKEY_API_KEY environment variable)", process.env.PDFMONKEY_API_KEY)
  .option("-o, --open-browser", "Open the template in the default browser")
  .option("-p, --port <port>", "The port to run the server on (default: 2081 or PORT environment variable)", process.env.PORT || 2081)
  .option("-l, --livereload-port <port>", "Livereload port (default: 2082 or LIVE_RELOAD_PORT environment variable)", process.env.LIVE_RELOAD_PORT || 2082)
  .option("-t, --template-id <templateId>", "The ID of the template to use (default: current folder name)")
  .action(watchCommand);

program.parse(process.argv);
