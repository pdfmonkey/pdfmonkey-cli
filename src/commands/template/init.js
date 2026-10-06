import nodePath from "path";

import { sanitizeIdentifier, writeTemplateContent } from "../../utils/files.js";
import { getTemplateCards, getTemplateWithFolder } from "../../utils/pdfmonkey.js";
import { initResource } from "../shared/init.js";
import { pickOne, pickWorkspace } from "../shared/pick.js";

export default async function initCommand(templateId, path, { apiKey, edit }) {
  templateId ??= (await pickTemplate(apiKey)).id;
  const template = await getTemplateWithFolder(templateId, apiKey);

  return await initResource({
    type: "template",
    resource: template,
    label: templateLabel(template),
    path,
    edit,
    pathCandidates: pathCandidates(template),
    write: writeTemplateContent,
  });
}

async function pickTemplate(apiKey) {
  const workspaceId = await pickWorkspace(apiKey);
  return pickOne("template", () => getTemplateCards(workspaceId, apiKey), templateLabel);
}

function templateLabel(template) {
  return [template.template_folder_identifier, template.identifier].filter(Boolean).join(" / ");
}

function pathCandidates(template) {
  const name = sanitizeIdentifier(template.identifier);
  const folder = sanitizeIdentifier(template.template_folder_identifier);

  return folder ? [name, nodePath.join(folder, template.id), nodePath.join(folder, name)] : [name];
}
