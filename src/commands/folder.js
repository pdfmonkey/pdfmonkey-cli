import { confirmDestruction, formatDate, output, printTable, resolveWorkspace } from "../utils/cli.js";
import { getClient } from "../utils/pdfmonkey.js";

export async function listCommand(options) {
  const workspaceId = await resolveWorkspace(options.workspace, options.apiKey);
  const folders = await getClient(options.apiKey).templateFolders.listAll({ workspace_id: workspaceId });

  folders.sort((a, b) => a.identifier.toLowerCase().localeCompare(b.identifier.toLowerCase()));

  output(folders, options, () =>
    printTable(folders, [
      ["ID", (folder) => folder.id],
      ["NAME", (folder) => folder.identifier],
      ["UPDATED", (folder) => formatDate(folder.updated_at)],
    ]),
  );
}

export async function createCommand(options) {
  const workspaceId = await resolveWorkspace(options.workspace, options.apiKey);
  const folder = await getClient(options.apiKey).templateFolders.create({
    workspace_id: workspaceId,
    identifier: options.name,
  });

  output(folder, options, () => console.log(`Folder ${folder.identifier} created with ID ${folder.id}`));
}

export async function renameCommand(folderId, name, options) {
  const folder = await getClient(options.apiKey).templateFolders.update(folderId, { identifier: name });
  output(folder, options, () => console.log(`Folder renamed to ${folder.identifier}`));
}

export async function deleteCommand(folderId, options) {
  const client = getClient(options.apiKey);
  const folder = await client.templateFolders.get(folderId);

  await confirmDestruction(`Delete folder ${folder.identifier}?`, options.yes);
  await client.templateFolders.delete(folderId);

  output({ id: folderId, deleted: true }, options, () => console.log(`Folder ${folder.identifier} deleted`));
}
