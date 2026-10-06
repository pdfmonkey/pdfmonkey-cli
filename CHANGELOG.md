# Changelog

## Unreleased

- Adding `workspace list` and `whoami` commands
- Adding `--json` output for scripts and AI agents
- Adding `list`, `get`, `create`, `update`, `publish` and `delete` template commands, supporting code and builder templates
- Adding `folder` commands to manage template folders
- Adding `PDFMONKEY_WORKSPACE` environment variable
- Adding `list`, `get`, `create`, `update` and `delete` snippet commands
- Adding `document` commands to list (with filters), get, create, update, download and delete documents
- Updating dependencies, Node.js 22.12 or later is now required
- Using the official `pdfmonkey` SDK to talk to the API
- Removing the `--debug` option of `watch` commands
- Fixing `template init <template-id>` failing to fetch the template
- Fixing the API key being displayed in the commands help
- Fixing the template ID missing from metadata when inferred from the folder name
- Fixing `template init` and `snippet init` crashing after an API error, e.g. with an unknown ID
- Fixing the `init` path prompt mentioning an `undefined` resource
- Fixing `watch` looping when cancelling the "add another directory" prompt
- Fixing `watch` asking to resolve conflicts of several snippets at once
- Fixing directory names containing an ID being mistaken for an ID
- Removing the `shell-escape` dependency

## 1.1.0 (2026-02-03)

- Adding base URL configuration from ENV

## 1.1.0-rc.0 (2025-05-20)

- Adding support for multi-resources watch
- Adding metadata file support
- Adding snippets management
- Adding _resource-based_ commands (e.g. `pdfmonkey template watch`)
- Adding template name as local folder name candidate
- Making `init` ask for workspace and template if none provided

## 1.0.2 (2025-01-24)

- Fixing the installation instrucions in the README

## 1.0.1 (2025-01-24)

- Fixing the version number retrieval

## 1.0.0 (2025-01-24)

- Initial release
