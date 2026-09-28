// Pure helpers that turn a write response or a peer push into the partial row
// it changed, so the panel can splice that one row into its cache
// (_mergeTask) and repaint the view body — instead of refetching every task
// in the workspace and re-feeding the whole panel root.
//
// No DOM and no `this`: everything here runs under plain node in a test.

// Fields each write service is authoritative for. _commitDetail fires these
// in parallel and each returns a FULL row read at its own moment — so the
// task.update row can still carry the status from before update_status
// landed. Merging only what the call owns keeps a slower sibling from putting
// an old value back.
const OWNED = {
  "task.update": [
    "title", "description", "priority", "due_date", "start_date",
    "reporter_uid", "mtime",
  ],
  "task.update_status": ["status", "rank", "mtime"],
  "task.update_assignee": ["assignee_uids", "mtime"],
};

const FULL_ROW = [
  "task.create", "task.update", "task.update_status", "task.update_assignee",
];

function rowOf(resp) {
  const row = Array.isArray(resp) ? resp[0] : resp;
  return row && row.id ? row : null;
}

function ownedPatch(service, row) {
  if (!row || !row.id) return null;
  const keys = OWNED[service];
  if (!keys) return row;
  const out = { id: row.id };
  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(row, k)) out[k] = row[k];
  }
  return out;
}

function applyLabelOps(ids, ops) {
  const out = Array.isArray(ids) ? ids.slice() : [];
  for (const { op, label_id, ok } of ops || []) {
    if (!ok) continue;
    const i = out.indexOf(label_id);
    if (op === "link" && i === -1) out.push(label_id);
    if (op === "unlink" && i !== -1) out.splice(i, 1);
  }
  return out;
}

// task.link_file answers with the task's FULL file list as of that insert.
// Links for one commit run in parallel, so the longest answer is the one that
// saw every insert.
function longestList(lists) {
  let best = null;
  for (const l of lists || []) {
    if (Array.isArray(l) && (!best || l.length > best.length)) best = l;
  }
  return best;
}

function peerPatch(service, data, current) {
  if (FULL_ROW.includes(service)) return rowOf(data);
  const id = data && data.task_id;
  if (!id) return null;
  switch (service) {
    case "task.link_label":
      if (!Array.isArray(data.labels)) return null;
      return { id, label_ids: data.labels.map((l) => l.label_id) };
    case "task.unlink_label":
      if (!current || !Array.isArray(current.label_ids)) return null;
      return {
        id,
        label_ids: current.label_ids.filter((l) => l !== data.label_id),
      };
    case "task.link_file":
      if (!Array.isArray(data.files)) return null;
      return { id, linked_files: data.files };
    case "task.unlink_file":
      if (!current || !Array.isArray(current.linked_files)) return null;
      return {
        id,
        linked_files: current.linked_files.filter(
          (f) => String(f.file_nid) !== String(data.file_nid),
        ),
      };
    default:
      return null;
  }
}

module.exports = { rowOf, ownedPatch, applyLabelOps, longestList, peerPatch };
