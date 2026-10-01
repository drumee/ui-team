// Pure model for the upload-progress "still uploading" warning banner.
// No DOM, no LOCALE global: callers pass LOCALE in, tests pass nothing and get
// the English fallbacks.

const UNFINISHED = new Set(["queued", "creating", "uploading", "paused"]);

const isUnfinished = (entry) => !!entry && UNFINISHED.has(entry.status);

function countUnfinished(items) {
  return (items || []).filter((it) => it && isUnfinished(it.entry)).length;
}

const t = (L, key, fallback) => (L && L[key]) || fallback;

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

module.exports = { isUnfinished, countUnfinished, warningCopy, withoutEntries };
