// Attachments staged in a Personal Calendar modal (task create/edit, meeting
// create). Pure: no DOM, no `this`, runs under plain node.
//
// An entry has the Task tab's pending-file shape (window/tasks/pending-uploads)
// so its eager-upload helpers apply unchanged:
//   { localKey, file, filename, extension, status, nid?, linked?,
//     bundleEntry?, bundleJob?, previewUrl? }
// status: queued (staged, or uploaded and waiting for the commit to link it) ·
// uploading · error · linked (edit mode: already on the task).
// Relative require, not the `window/...` alias, so node can load it.
const pending = require("../../window/tasks/pending-uploads");

const MAX_FILES = 20;

function splitFilename(name) {
  const safe = String(name || "");
  const dot = safe.lastIndexOf(".");
  if (dot <= 0 || dot === safe.length - 1) return { filename: safe, extension: "" };
  return { filename: safe.slice(0, dot), extension: safe.slice(dot + 1) };
}

function stageFiles(list, files, now = Date.now()) {
  const added = [];
  const overflow = [];
  let i = 0;
  for (const file of Array.from(files || [])) {
    if (list.length >= MAX_FILES) {
      overflow.push(file);
      continue;
    }
    const { filename, extension } = splitFilename(file && file.name);
    const entry = {
      localKey: `local:${now}:${i++}:${(file && file.name) || ""}`,
      file,
      filename,
      extension,
      status: "queued",
    };
    list.push(entry);
    added.push(entry);
  }
  return { added, overflow };
}

const fileKey = (pf) => (pf && pf.linked && pf.nid ? `nid:${pf.nid}` : (pf && pf.localKey) || "");

const nidsToLink = (list) =>
  (list || []).filter((pf) => pf && pf.nid && !pf.linked && pf.status !== "error").map((pf) => pf.nid);

const failedFiles = (list) => (list || []).filter((pf) => pf && pf.status === "error");

function isFileDrag(e) {
  const types = e && e.dataTransfer && e.dataTransfer.types;
  return !!types && Array.from(types).includes("Files");
}

module.exports = {
  MAX_FILES,
  splitFilename,
  stageFiles,
  fileKey,
  nidsToLink,
  failedFiles,
  isFileDrag,
  pairEntries: pending.pairEntries,
  settleEagerFile: pending.settleEagerFile,
  settleEagerBatch: pending.settleEagerBatch,
  unfinishedPending: pending.unfinishedPending,
  abandonedPending: pending.abandonedPending,
  itemsOf: pending.itemsOf,
};
