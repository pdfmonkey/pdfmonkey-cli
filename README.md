![PDFMonkey CLI](/assets/logo-cli.svg)

# PDFMonkey CLI

This CLI tool is a great solution for developers who want to author [PDFMonkey](https://pdfmonkey.io) templates using their own code editor and local development environment.

## Installation

The PDFMonkey CLI can be installed using npm.

```bash
npm install -g @pdfmonkey/cli
```

Once installed, the `pdfmonkey` command will be available in your terminal.

## Help

To get a list of available commands and general help, run the following command:

```bash
pdfmonkey help
```

## Authentication

There are two ways to authenticate with the PDFMonkey CLI:

1. All commands accept the `-k` or `--api-key` option to specify an API key.
2. You can also set the `PDFMONKEY_API_KEY` environment variable.

> [!IMPORTANT]
> **API Key in this README**
>
> The commands below will **assume the API key is set in the environment variable.**

## Command Structure

PDFMonkey CLI supports two command structures:

### Resource-based Commands (Recommended)

Commands are organized by resource type:

```bash
pdfmonkey <resource> <command> [options]
```

Currently supported resources:

- `template` or `tpl`: Manage PDFMonkey templates
- `snippet` or `snp`: Manage PDFMonkey snippets

For example:

```bash
pdfmonkey template init <template-id>
# or using the shorthand alias
pdfmonkey tpl init <template-id>
```

### Direct Commands (shorthand)

Templates being the most common resource, the CLI also supports direct commands:

```bash
pdfmonkey init <template-id>
# is the same as
pdfmonkey template init <template-id>

pdfmonkey watch <path>
# is the same as
pdfmonkey template watch <path>
```

## Template Management

### Init

To start editing a PDFMonkey template, run the following command:

```bash
pdfmonkey template init
```

The command will help you select a workspace and find the template you want to edit.

Alternatively, you can specify the template ID as a second argument.

```bash
pdfmonkey template init <template-id>
```

You will then be prompted to choose the destination folder for the template files. You can also specify the destination folder as a second argument.

```bash
pdfmonkey template init <template-id> <destination-folder>
```

> [!TIP]
> **Open in Editor**
>
> You can also open the created folder in your default editor using the `-e` or `--edit` option.
>
> ```bash
> pdfmonkey template init <template-id> -e
> ```

### Watch

To start watching a template folder and sync the changes to PDFMonkey, run the following command:

```bash
pdfmonkey template watch
```

This will start watching files in **the current folder** and sync automatically. The CLI uses the metadata stored in the `.pdfmonkey.json` file to identify the template.

To monitor a different folder, simply pass the path as the first argument:

```bash
pdfmonkey template watch <path>
```

If for some reason the folder doesn't contain metadata or you want to use a different template ID, you can specify it using the `-t` option:

```bash
pdfmonkey template watch [path] -t <template-id>
```

### Preview

The `watch` command will start a local server to preview the template. The preview will automatically refresh when changes are synced.

You can open the preview when the server is running using the `-o` or `--open-browser` option.

```bash
pdfmonkey template watch -o
```

By default, the preview server runs on port 2081 and the live-reload server runs on port 2082. You can specify different ports using the `-p/--port` and `-l/--livereload-port` options.

```bash
pdfmonkey template watch -p 2083 -l 2084
```

Alternatively, you can set the `PORT` and `LIVE_RELOAD_PORT` environment variables to customize the ports.

```bash
PORT=2083 LIVE_RELOAD_PORT=2084 pdfmonkey template watch
```

### Debug Preview

Sometimes, it can be easier to debug the generated HTML instead of the PDF. You can do this by using the `-D` or `--debug` option.

```bash
pdfmonkey template watch -D -o
```

This will open the debug preview in your default browser.

### Dealing with conflicts

When starting the `watch` command, the CLI will check if there are any conflicts between the local files and the template data. If there are, you will be prompted to choose between:

1. Overwrite the local files with the template data.
2. Keep the local files and override the template data on the next sync.
3. To see a diff of the changes.

By default, the diff tool used is `diff -u` and the patch is displayed with the `less` pager. You can specify different diff-tool and pager using the `DIFF` and `PAGER` environment variables, respectively.

```bash
DIFF=delta PAGER=delta pdfmonkey template watch
```

## Snippet Management

### Init

To start editing a PDFMonkey snippet, run the following command:

```bash
pdfmonkey snippet init
```

The command will help you select a workspace and find the snippet you want to edit.

Alternatively, you can specify the snippet ID as a second argument.

```bash
pdfmonkey snippet init <snippet-id>
```

You will then be prompted to choose the destination folder for the snippet. You can also specify the destination folder as a second argument.

```bash
pdfmonkey snippet init <snippet-id> <destination-folder>
```

The snippet will be stored in a folder structure similar to templates, with the code in a file named `code.liquid`.

> [!TIP]
> **Open in Editor**
>
> You can also open the created file in your default editor using the `-e` or `--edit` option.
>
> ```bash
> pdfmonkey snippet init <snippet-id> -e
> ```

### Watch

To start watching a snippet folder and sync the changes to PDFMonkey, run the following command:

```bash
pdfmonkey snippet watch
```

This will start watching the `code.liquid` file in the **current folder** and sync automatically when changes are detected. The CLI uses the metadata stored in the `.pdfmonkey.json` file to identify the snippet.

To monitor a different folder, simply pass the path as the first argument:

```bash
pdfmonkey snippet watch <path>
```

If for some reason the folder doesn't contain metadata or you want to use a different snippet ID, you can specify it using the `-s` option:

```bash
pdfmonkey snippet watch [path] -s <snippet-id>
```

## Watch Multiple Resources

The CLI allows you to watch multiple resources (one templates and multiple snippets) simultaneously with a single command:

```bash
pdfmonkey watch
```

This will prompt you to interactively select the folders you want to watch.

You can also directly specify multiple paths:

```bash
pdfmonkey watch path/to/template path/to/snippet
```

When watching multiple resources, the command will automatically detect if each folder contains a template or a snippet based on the metadata. Note that **only one template can be watched at a time**, but you can watch multiple snippets alongside it.

This combined watch command supports the same options as the `template watch` command:

```bash
pdfmonkey watch -D -o -p 2083 -l 2084
```

## Metadata

The CLI stores metadata in a `.pdfmonkey.json` file within each resource folder. This file contains the resource type and ID, allowing commands to run without explicitly specifying IDs. This metadata is automatically created when initializing resources and used by the watch commands.

The `.pdfmonkey.json` file looks like this:

```json
{
  "type": "template",
  "id": "123e4567-e89b-12d3-a456-426614174000"
}
```

## Configuration

Here is a summary of the environment variables that can be set to customize the behavior of the CLI:

- `PDFMONKEY_API_KEY`: The API key to use for authentication.
- `DIFF`: The diff tool to use.
- `PAGER`: The pager to use when displaying diffs.
- `PORT`: The port to run the preview server on.
- `LIVE_RELOAD_PORT`: The port to run the live-reload server on.

## License

This project is open-sourced under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for details.
