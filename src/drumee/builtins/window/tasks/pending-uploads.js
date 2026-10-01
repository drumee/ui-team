// Pure helpers for create/detail attachments that upload as soon as they are
// picked (through window/upload-progress) instead of on Create/Update.
//
// A pending entry (`pf`) gains, while it uploads:
//   bundleEntry — the media/bundle BundleEntry carrying its File
//   bundleJob   — the BundleJob running it (for cancelEntry)
// and on success the same `nid` a search-picked file has, so the commit only
// has to link it. No DOM and no `this`: runs under plain node in a test.

const UNFINISHED = new Set(["queued", "creating", "uploading", "paused"]);

function isUnfinishedPf(pf) {
  return !!(pf && !pf.nid && pf.bundleEntry && UNFINISHED.has(pf.bundleEntry.status));
}

// Dropped from its bundle (the warning's "without", Cancel all, a ✕) but still
// holding its File — the commit must not quietly upload it the old way.
function isCanceledPf(pf) {
  return !!(pf && !pf.nid && pf.bundleEntry && pf.bundleEntry.status === "canceled");
}

const unfinishedPending = (list) => (list || []).filter(isUnfinishedPf);
const abandonedPending = (list) =>
  (list || []).filter((pf) => isUnfinishedPf(pf) || isCanceledPf(pf));
const committablePending = (list) => (list || []).filter((pf) => !isCanceledPf(pf));
const withoutUnfinished = (list) => (list || []).filter((pf) => !isUnfinishedPf(pf));

function pairEntries(pending, roots) {
  const bySource = new Map((roots || []).map((r) => [r.source, r]));
  const paired = [];
  for (const pf of pending || []) {
    if (!pf || pf.nid || !pf.file) continue;
    const entry = bySource.get(pf.file);
    if (!entry) continue;
    pf.bundleEntry = entry;
    paired.push(pf);
  }
  return paired;
}

function settleEagerFile(pf, node, hubId) {
  const nid = node && (node.nid || node.id);
  if (!pf || !nid) return false;
  pf.nid = nid;
  pf.hub_id = node.hub_id || hubId;
  // The server resolved the collision-safe name; show that, not the guess.
  if (node.filename || node.user_filename) pf.filename = node.filename || node.user_filename;
  if (node.ext || node.extension) pf.extension = node.ext || node.extension;
  pf.provisional = 0;
  pf.status = "queued"; // = "has a nid, links on save", like a search pick
  return true;
}

function settleEagerBatch(pfs) {
  const fallback = [];
  const dropped = [];
  for (const pf of pfs || []) {
    if (!pf || pf.nid || !pf.bundleEntry) continue;
    const st = pf.bundleEntry.status;
    if (st === "canceled") {
      dropped.push(pf);
    } else if (st === "error" || st === "skipped") {
      // Commit-time upload still has the File and the subfolder fallback.
      pf.bundleEntry = null;
      pf.bundleJob = null;
      pf.status = "queued";
      fallback.push(pf);
    }
  }
  return { fallback, dropped };
}

const itemsOf = (pfs) => (pfs || []).map((pf) => ({ entry: pf.bundleEntry, job: pf.bundleJob }));

module.exports = {
  unfinishedPending,
  withoutUnfinished,
  abandonedPending,
  committablePending,
  pairEntries,
  settleEagerFile,
  settleEagerBatch,
  itemsOf,
};
