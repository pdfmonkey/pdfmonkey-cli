import {
  compact,
  confirmDestruction,
  formatDate,
  output,
  printDetails,
  printTable,
  resolveEngine,
  resolveFolder,
  resolveWorkspace,
} from "../../utils/cli.js";
import { hasMetadata, readTemplateContent, writeMetadata } from "../../utils/files.js";
import { getClient, getTemplateCards } from "../../utils/pdfmonkey.js";

export async function listCommand(options) {
  const { apiKey, folder } = options;
  const workspaceId = await resolveWorkspace(options.workspace, apiKey, { required: false });
  const folders = await resolveFolder(folder, () => workspaceId, apiKey);
  const templates = await getTemplateCards(workspaceId, apiKey, folders);

  output(templates, options, () =>
    printTable(templates, [
      ["ID", (template) => template.id],
      ["FOLDER", (template) => template.template_folder_identifier],
      ["NAME", (template) => template.identifier],
      ["MODE", (template) => template.edition_mode],
      ["ENGINE", (template) => template.pdf_engine_name],
      ["UNPUBLISHED", (template) => (template.is_draft ? "yes" : "")],
      ["UPDATED", (template) => formatDate(template.updated_at)],
    ]),
  );
}

export async function getCommand(templateId, options) {
  const template = await getClient(options.apiKey).documentTemplates.get(templateId);
  output(template, options, printTemplate);
}

export async function createCommand(options) {
  const { apiKey, name, mode, outputType, from } = options;
  const client = getClient(apiKey);
  const workspaceId = await resolveWorkspace(options.workspace, apiKey);
  const folderId = await resolveFolder(options.folder, () => workspaceId, apiKey);
  const engineId = await resolveEngine(options.engine, apiKey);

  const template = await client.documentTemplates.create(
    compact({
      workspace_id: workspaceId,
      identifier: name,
      edition_mode: mode,
      output_type: outputType,
      template_folder_id: folderId === "none" ? undefined : folderId,
      pdf_engine_id: engineId,
      pdf_engine_draft_id: engineId,
      ...(from && readTemplateContent(from)),
    }),
  );

  // Link the local directory to the new template so it can be watched right away
  if (from && !hasMetadata(from)) {
    writeMetadata("template", template.id, from);
  }

  output(template, options, () => console.log(`Template ${template.identifier} created with ID ${template.id}`));
}

export async function updateCommand(templateId, options) {
  const { apiKey, name, outputType, from } = options;
  const client = getClient(apiKey);

  const getWorkspaceId = async () =>
    options.workspace
      ? await resolveWorkspace(options.workspace, apiKey)
      : (await client.documentTemplates.get(templateId)).app_id;

  const folderId = await resolveFolder(options.folder, getWorkspaceId, apiKey);

  const params = compact({
    identifier: name,
    output_type: outputType,
    template_folder_id: folderId === "none" ? null : folderId,
    pdf_engine_draft_id: await resolveEngine(options.engine, apiKey),
    ...(from && readTemplateContent(from)),
  });

  if (Object.keys(params).length === 0) {
    throw new Error("Nothing to update, see `pdfmonkey template update --help`.");
  }

  const template = await client.documentTemplates.update(templateId, params);
  output(template, options, () => console.log(`Template ${template.identifier} updated`));
}

export async function publishCommand(templateId, options) {
  const client = getClient(options.apiKey);
  const draft = await client.documentTemplates.get(templateId);

  // Same as the dashboard: every draft attribute becomes the published one
  const template = await client.documentTemplates.update(templateId, {
    body: draft.body_draft,
    scss_style: draft.scss_style_draft,
    sample_data: draft.sample_data_draft,
    settings: draft.settings_draft,
    // Sent back so the API applies the same defaults (paper format…) to both
    settings_draft: draft.settings_draft,
    pdf_engine_id: draft.pdf_engine_draft_id,
    schema_specification_id: draft.schema_specification_draft_id,
  });

  output(template, options, () => console.log(`Template ${template.identifier} published`));
}

export async function deleteCommand(templateId, options) {
  const client = getClient(options.apiKey);
  const template = await client.documentTemplates.get(templateId);

  await confirmDestruction(`Delete template ${template.identifier}?`, options.yes);
  await client.documentTemplates.delete(templateId);

  output({ id: templateId, deleted: true }, options, () => console.log(`Template ${template.identifier} deleted`));
}

function printTemplate(template) {
  printDetails([
    ["ID", template.id],
    ["Name", template.identifier],
    ["Workspace ID", template.app_id],
    ["Folder ID", template.template_folder_id],
    ["Mode", template.edition_mode],
    ["Output type", template.output_type],
    ["Created", formatDate(template.created_at)],
    ["Updated", formatDate(template.updated_at)],
    ["Preview URL", template.preview_url],
  ]);
}
