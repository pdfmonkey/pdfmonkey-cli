# Changelog

## Unreleased

- Adding `workspace list` and `whoami` commands
- Adding `--json` output for scripts and AI agents
- Updating dependencies, Node.js 22.12 or later is now required
- Using the official `pdfmonkey` SDK to talk to the API
- Fixing `template init <template-id>` failing to fetch the template
- Fixing the API key being displayed in the commands help
- Fixing the template ID missing from metadata when inferred from the folder name

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
