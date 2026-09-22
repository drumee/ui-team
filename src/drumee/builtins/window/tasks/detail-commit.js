// Pure helpers for the detail card's Update (_commitDetail).
//
// The card is a THREE-WAY MERGE:
//   base  — the task as it was when the card opened (_detailBase)
//   draft — what the user has in the card now (_detailDraft)
//   fresh — the task as the cache holds it at Update time; peer pushes keep
//           reloading the cache while the card is open
//
// Only fields the USER changed (draft ≠ base) are sent, applied on top of
// fresh. Diffing draft against fresh alone — what this replaces — treated a
// colleague's change made while the card was open as the user's own edit and
// wrote the opened value back over it. When both changed the same field, the
// user's value wins (last writer).
//
// No DOM and no `this`: everything here runs under plain node in a test.

const trim = (v) => String(v == null ? "" : v).trim();
const list = (v) => (Array.isArray(v) ? v.slice() : []);
// The stored range start only counts while the Duration switch is on.
const startOf = (s) => (s.duration_on ? trim(s.start_date) : "");

function snapshotTask(task, { assignees, noStatus }) {
  return {
    title: task.title || "",
    description: task.description || "",
    due_date: task.due_date || "",
    start_date: task.start_date || "",
    duration_on: !!task.start_date,
    status: task.status || noStatus,
    priority: task.priority || "medium",
    // A task from before the reporter field reads as reported by its creator.
    reporter_uid: task.reporter_uid || task.created_by || "",
    assignees: list(assignees),
    labels: list(task.label_ids),
  };
}

function setOps(base, draft) {
  return {
    added: draft.filter((x) => !base.includes(x)),
    removed: base.filter((x) => !draft.includes(x)),
  };
}

const sameSet = (a, b) =>
  a.length === b.length && [...a].sort().join(",") === [...b].sort().join(",");

function planDetailCommit(base, draft, fresh) {
  const update = {};

  const title = trim(draft.title);
  if (title && title !== trim(base.title) && title !== trim(fresh.title)) {
    update.title = title;
  }

  // Marker form on all three sides (the editor serializes chips to markers).
  const desc = draft.description || "";
  if (desc !== (base.description || "") && desc !== (fresh.description || "")) {
    update.description = desc;
    // Notify only members tagged in this edit who weren't tagged before.
    const before = list(draft._mentioned_before);
    update.mention_uids = list(draft.mention_uids).filter((u) => !before.includes(u));
  }

  const priority = draft.priority || "medium";
  if (priority !== base.priority && priority !== fresh.priority) {
    update.priority = priority;
  }

  const reporter = draft.reporter_uid || "";
  if (reporter && reporter !== base.reporter_uid && reporter !== fresh.reporter_uid) {
    update.reporter_uid = reporter;
  }

  const due = trim(draft.due_date);
  const start = startOf(draft);
  const datesTouched = due !== trim(base.due_date) || start !== startOf(base);
  const datesDiffer = due !== trim(fresh.due_date) || start !== startOf(fresh);
  if (Object.keys(update).length || (datesTouched && datesDiffer)) {
    // task_update writes BOTH dates unconditionally, so they ride along on
    // every update. An untouched date goes back as the CURRENT value (fresh),
    // never the one the card opened with — that was the date half of the
    // lost-update bug.
    update.due_date = (datesTouched ? due : trim(fresh.due_date)) || null;
    update.start_date = (datesTouched ? start : startOf(fresh)) || null;
  }

  const status =
    draft.status && draft.status !== base.status && draft.status !== fresh.status
      ? draft.status
      : null;

  // task.update_assignee REPLACES the set, so send fresh + my adds − my
  // removes: a peer's assignee change survives a save that touched others.
  let assignees = null;
  const a = setOps(base.assignees, list(draft.assignees));
  if (a.added.length || a.removed.length) {
    const merged = fresh.assignees.filter((u) => !a.removed.includes(u));
    for (const u of a.added) if (!merged.includes(u)) merged.push(u);
    if (!sameSet(merged, fresh.assignees)) assignees = merged;
  }

  const l = setOps(base.labels, list(draft.labels));
  return {
    update: Object.keys(update).length ? update : null,
    status,
    assignees,
    link: l.added.filter((x) => !fresh.labels.includes(x)),
    unlink: l.removed.filter((x) => fresh.labels.includes(x)),
  };
}

// Apply the label link/unlink calls that succeeded to a list of label ids.
function applyLabelOps(ids, ops) {
  const out = list(ids);
  for (const { op, label_id, ok } of ops || []) {
    if (!ok) continue;
    const i = out.indexOf(label_id);
    if (op === "link" && i === -1) out.push(label_id);
    if (op === "unlink" && i !== -1) out.splice(i, 1);
  }
  return out;
}

// After a PARTIAL failure the card stays open for a retry. Move the base up to
// the draft for every group that landed, so the retry re-sends only what did
// not — re-sending a landed title would log a second activity row and repeat
// its mention notifications.
function advanceBase(base, draft, landed) {
  const next = { ...base, assignees: list(base.assignees), labels: list(base.labels) };
  if (landed.update) {
    if (trim(draft.title)) next.title = draft.title;
    next.description = draft.description || "";
    next.priority = draft.priority || "medium";
    if (draft.reporter_uid) next.reporter_uid = draft.reporter_uid;
    next.due_date = draft.due_date || "";
    next.start_date = draft.start_date || "";
    next.duration_on = !!draft.duration_on;
  }
  if (landed.status && draft.status) next.status = draft.status;
  if (landed.assignees) next.assignees = list(draft.assignees);
  next.labels = applyLabelOps(next.labels, landed.labels);
  return next;
}

// Pending attachments after a commit: linked ones are done; one that uploaded
// but failed to link keeps its File and gains the nid, so the retry links it
// instead of uploading a second copy ("a(1).png") into the task folder.
function settlePendingFiles(pending, outcomes) {
  const out = [];
  for (const pf of list(pending)) {
    const o = (outcomes || []).find((x) => x.pf === pf);
    if (o && o.linked) continue;
    out.push(o && o.nid && !pf.nid ? { ...pf, nid: o.nid } : pf);
  }
  return out;
}

module.exports = { snapshotTask, planDetailCommit, advanceBase, settlePendingFiles };
