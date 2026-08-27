/**
 * The workspace descriptor a guided flow carries between its steps.
 *
 * Every flow here works the same way: one step creates a workspace, a later
 * one reopens it to upload into. The descriptor is what connects the two, and
 * it may have to survive a page reload in between. Kept in its own module (no
 * DOM, no globals) so the parsing is unit-testable — the orchestrators extend
 * the LetcBox global and cannot be required under bare Node.
 */

/** The only fields Wm.loadWorkspace reads. Anything else the server sent is
 *  dropped: it would just rot in localStorage. */
const FIELDS = ["hub_id", "nid", "area", "filename"];

/** Missing, or the hub/0 placeholder. window/folder/index.js applies the same
 *  test before trusting a nid; a real workspace root is never 0, and passing
 *  one through would open Home instead. */
function blank(v) {
  return v == null || `${v}` === "" || `${v}` === "0";
}

/**
 * Parse and validate a stored descriptor.
 *
 * @param {string|object|null} raw JSON from localStorage, or an object
 * @returns {{hub_id: *, nid: *, area: string, filename: string}|null}
 *   null when there is nothing usable — callers fall back to the legacy Step 3.
 */
function readDescriptor(raw) {
  if (!raw) return null;
  let d = raw;
  if (typeof raw === "string") {
    try {
      d = JSON.parse(raw);
    } catch (e) {
      return null; // hand-edited or truncated storage — not fatal
    }
  }
  if (!d || typeof d !== "object" || Array.isArray(d)) return null;
  // Both are required: loadWorkspace warns and bails without hub_id, and
  // without nid it resolves the hub HOME root instead of the workspace.
  if (blank(d.hub_id) || blank(d.nid)) return null;
  const out = {};
  for (const k of FIELDS) {
    out[k] = d[k] == null ? "" : d[k];
  }
  return out;
}

module.exports = { readDescriptor, FIELDS };
