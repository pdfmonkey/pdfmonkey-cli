import http from "http";
import livereload from "livereload";
import chalk from "chalk";
import { log } from "@clack/prompts";

// Starts a web server for template preview with live reload capabilities.
//
// @param {number} port - The port to run the preview server on
// @param {number} liveReloadPort - The port to run the live reload server on
// @param {object} dataCallbacks - Object containing callback functions that provide dynamic data
// @param {Function} dataCallbacks.templateId - Function that returns the current template ID
// @param {Function} dataCallbacks.previewUrl - Function that returns the current preview URL
//
// @returns {object} Object containing the HTTP server and live reload server instances
export function startWebServer(port, liveReloadPort, dataCallbacks) {
  const server = http.createServer();

  server.on("request", (req, res) => {
    const templateId = dataCallbacks.templateId();
    const previewUrl = dataCallbacks.previewUrl();

    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${templateId}</title>
          <script src="http://localhost:${liveReloadPort}/livereload.js?snipver=1"></script>
          <script>
            document.write('<iframe src="${previewUrl}" width="100%" height="100%" style="border: none;"></iframe>')
          </script>
        </head>
        <body style="margin: 0; padding: 0; height: 100dvh; width: 100dvw;">
        </body>
      </html>
    `);
  });

  server.listen(port, () => {
    log.info(`Preview server running on ${chalk.underline(`http://localhost:${port}`)}`);
  });

  const liveReloadServer = livereload.createServer({ port: liveReloadPort }, () => {
    log.info(`LiveReload server running on ${chalk.underline(`http://localhost:${liveReloadPort}`)}`);
  });

  return { server, liveReloadServer };
}
