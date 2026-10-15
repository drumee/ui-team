// Pure model for the upload-progress "still uploading" warning card.
// No DOM, no LOCALE global: callers pass LOCALE in, tests pass nothing and get
// the English fallbacks.

const UNFINISHED = new Set(["queued", "creating", "uploading", "paused"]);

const isUnfinished = (entry) => !!entry && UNFINISHED.has(entry.status);

function countUnfinished(items) {
  return (items || []).filter((it) => it && isUnfinished(it.entry)).length;
}

function entryPercent(entry, job) {
  if (!entry) return 0;
  if (entry.status === "done" || entry.status === "skipped") return 100;
  const cur = job && job._current;
  if (cur && cur.entry === entry && entry.size > 0) {
    // 100 is reserved for "the server answered" — the last byte leaving the
    // browser is not that.
    return Math.max(0, Math.min(99, Math.floor((100 * (cur.loaded || 0)) / entry.size)));
  }
  return 0;
}

function stateOf(entry) {
  switch (entry.status) {
    case "done":
    case "skipped":
      return "done";
    case "paused":
      return "paused";
    case "queued":
      return "waiting";
    case "error":
    case "canceled":
      return "failed";
    default:
      return "uploading";
  }
}

const t = (L, key, fallback) => (L && L[key]) || fallback;

function statusText(state, pct, L) {
  switch (state) {
    case "waiting": return t(L, "UPLOAD_WAITING", "Waiting...");
    case "paused": return t(L, "UPLOAD_PAUSED_SHORT", "Paused");
    case "done": return t(L, "UPLOAD_DONE_SHORT", "Uploaded");
    case "failed": return t(L, "UPLOAD_FAILED_SHORT", "Failed");
    default: return t(L, "UPLOADING_PERCENT", "Uploading... {0}%").replace("{0}", pct);
  }
}

function extBadge(name) {
  const s = String(name || "");
  const i = s.lastIndexOf(".");
  return i > 0 && i < s.length - 1 ? s.slice(i + 1, i + 5).toUpperCase() : "FILE";
}

function warningRows(items, L) {
  return (items || [])
    .filter((it) => it && it.entry)
    .map(({ entry, job }) => {
      const pct = entryPercent(entry, job);
      const state = stateOf(entry);
      return {
        id: entry.id,
        name: entry.name,
        ext: extBadge(entry.name),
        pct,
        state,
        statusText: statusText(state, pct, L),
      };
    });
}

function warningCopy(action, unfinished, L) {
  const update = action === "update";
  const n = unfinished || 0;
  let body;
  if (n === 0) {
    body = t(L, "UPLOADS_NOW_FINISHED", "All files have finished uploading.");
  } else {
    const count = n === 1
      ? t(L, "UPLOAD_UNFINISHED_ONE", "1 file hasn't finished uploading yet.")
      : t(L, "UPLOAD_UNFINISHED_MANY", "{0} files haven't finished uploading yet.").replace("{0}", n);
    const hint = update
      ? t(L, "UPLOAD_UNFINISHED_UPDATE_HINT", "If you update this task now, the uploading file(s) won't be attached to the task.")
      : t(L, "UPLOAD_UNFINISHED_CREATE_HINT", "If you create this task now, the uploading file(s) won't be attached to the task.");
    body = `${count} ${hint}`;
  }
  let skip;
  if (n === 0) skip = update ? t(L, "UPDATE", "Update") : t(L, "CREATE", "Create");
  else if (n === 1) skip = update ? t(L, "UPDATE_WITHOUT_FILE", "Update without this file") : t(L, "CREATE_WITHOUT_FILE", "Create without this file");
  else skip = update ? t(L, "UPDATE_WITHOUT_FILES", "Update without these files") : t(L, "CREATE_WITHOUT_FILES", "Create without these files");
  return {
    title: t(L, "UPLOADS_STILL_RUNNING", "Some files are still uploading"),
    body,
    keep: t(L, "KEEP_UPLOADING", "Keep uploading"),
    skip,
  };
}

function withoutEntries(roots, entries) {
  const gone = new Set(entries || []);
  return (roots || []).filter((r) => !gone.has(r));
}

module.exports = {
  isUnfinished, countUnfinished, entryPercent, warningRows, warningCopy, withoutEntries,
};
