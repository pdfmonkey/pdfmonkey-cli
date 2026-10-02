import { formatDate, output, printDetails, printTable } from "../utils/cli.js";
import { getClient, getWorkspaces } from "../utils/pdfmonkey.js";

export async function whoamiCommand(options) {
  // Never print the API key
  // eslint-disable-next-line no-unused-vars
  const { auth_token, ...user } = await getClient(options.apiKey).currentUser.get();

  output(user, options, () =>
    printDetails([
      ["Email", user.email],
      ["Name", user.desired_name],
      ["Plan", user.current_plan],
      ["Available documents", user.available_documents],
    ]),
  );
}

export async function workspaceListCommand(options) {
  const workspaces = await getWorkspaces(options.apiKey);

  // eslint-disable-next-line no-unused-vars
  const rows = workspaces.map(({ invite_token, ...workspace }) => workspace);

  output(rows, options, () =>
    printTable(rows, [
      ["ID", (workspace) => workspace.id],
      ["NAME", (workspace) => workspace.identifier],
      ["PLAN", (workspace) => workspace.current_plan],
      ["UPDATED", (workspace) => formatDate(workspace.updated_at)],
    ]),
  );
}
