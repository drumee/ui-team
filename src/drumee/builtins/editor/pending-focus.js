// ==================================================================== *
//   FILE : builtins/editor/pending-focus
//   TYPE : Helper — "open this file ON that comment", across a window launch
// ==================================================================== *

/**
 * A "<A> commented on <file>" notification opens the file the way a
 * double-click on its tile does (panel/activity widget/item), which launches
 * the editor window with no room for extra arguments. So the click leaves the
 * comment to show here, keyed by the file's nid, and the editor that opens
 * that nid takes it once it is mounted and polls until the comment is there.
 *
 *   target  { comment_id, tab_id? }                  Casual Docs (.udoc)
 *           { comment_id, sub_unit_id, ref? }        Casual Sheets (.usheet)
 *           { comment_guid }                         OnlyOffice (docx/xlsx)
 *
 * An entry is used once, and forgotten after TTL_MS: opening the same file
 * later from anywhere else must not jump to an old comment.
 */
const TTL_MS = 60 * 1000;
const pending = new Map();

function set(nid, target) {
  if (!nid || !target || typeof target !== "object") return;
  pending.set(String(nid), { ...target, at: Date.now() });
}

/** The target left for `nid`, once; null when none or stale. */
function take(nid, now = Date.now()) {
  const key = String(nid || "");
  const entry = pending.get(key);
  pending.delete(key);
  if (!entry || now - entry.at > TTL_MS) return null;
  const { at, ...target } = entry;
  return target;
}

/**
 * Resolve with the first truthy `probe()` result, polling every `every` ms,
 * or with null after `timeout` ms or once `cancelled()` says so. A probe that
 * throws counts as "not yet".
 */
function waitFor(probe, { timeout = 15000, every = 300, cancelled = () => false } = {}) {
  const until = Date.now() + timeout;
  return new Promise((resolve) => {
    const tick = () => {
      if (cancelled()) return resolve(null);
      let v = null;
      try {
        v = probe();
      } catch (e) {
        v = null;
      }
      if (v) return resolve(v);
      if (Date.now() >= until) return resolve(null);
      setTimeout(tick, every);
    };
    tick();
  });
}

module.exports = { set, take, waitFor, TTL_MS };
