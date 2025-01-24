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

## Init

To start editing a PDFMonkey template, run the following command:

```bash
pdfmonkey init <template-id>
```

You will then be prompted to choose the destination directory for the template files. You can also specify the destnation folder as a second argument.

```bash
pdfmonkey init <template-id> <destination-folder>
```

> [!TIP]
> **Open in Editor**
>
> You can also open the created folder in your default editor using the `-e` or `--edit` option.
>
> ```bash
> pdfmonkey init <template-id> -e
> ```

## Watch

To start watching a template folder and sync the changes to PDFMonkey, run the following command:

```bash
pdfmonkey watch -t <template-id>
```

This will start watching files in **the current folder** and sync automatically.

To monitor a different folder, simply pass the path as first argument:

```bash
pdfmonkey watch <path> -t <template-id>
```

> [!TIP]
> **Template ID and folder name**
>
> If the watched template is named after the ID of the template, you can omit the `-t` option.
>
> ```bash
> pwd
> /Users/pdfmonkey/templates/B1001CF2-53FC-4DC6-B51D-36B358743752
>
> pdfmonkey watch
> # Watches the current folder and syncs the matching template
> ```

### Preview

The `watch` command will start a local server to preview the template. The preview will automatically refresh when changes are synced.

You can open the preview when the server is running using the `-o` or `--open-browser` option.

```bash
pdfmonkey watch -o
```

By default, the preview server runs on port 2081 and the live-reload server runs on port 2082. You can specify different ports using the `-p/--port` and `-l/--livereload-port` options.

```bash
pdfmonkey watch -p 2083 -l 2084
```

Alternatively, you can set the `PORT` and `LIVE_RELOAD_PORT` environment variables to customize the ports.

```bash
PORT=2083 LIVE_RELOAD_PORT=2084 pdfmonkey watch
```

### Debug Preview

Sometimes, it can be easier to debug the generated HTML instead of the PDF. You can do this by using the `-D` or `--debug` option.

```bash
pdfmonkey watch -D -o
```

This will open the debug preview in your default browser.

### Dealing with conflicts

When starting the `watch` command, the CLI will check if there are any conflicts between the local files and the template data. If there are, you will be prompted to choose between:

1. Overwrite the local files with the template data.
2. Keep the local files and override the template data on the next sync.
3. To see a diff of the changes.

By default, the diff tool used is `diff -u` and the patch is displayed with the `less` pager. You can specify different diff-tool and pager using the `DIFF` and `PAGER` environment variables, respectively.

```bash
DIFF=delta PAGER=delta pdfmonkey watch
```

## Configuration

Here is a summary of the environment variables that can be set to customize the behavior of the CLI:

* `PDFMONKEY_API_KEY`: The API key to use for authentication.
* `DIFF`: The diff tool to use.
* `PAGER`: The pager to use when displaying diffs.
* `PORT`: The port to run the preview server on.
* `LIVE_RELOAD_PORT`: The port to run the live-reload server on.

## License

This project is open-sourced under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please see the [CONTRIBUTING.md](CONTRIBUTING.md) file for details.
