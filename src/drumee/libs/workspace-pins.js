/**
 * Pinned workspaces — the rules, in one place (Lexis, 2026-10-07).
 *
 * A user pins workspaces from the switcher's ⋯ menu. Pinned ones are listed
 * above every other heading in the switcher (desktop and phone), newest pin
 * first, and can be dragged into any order. The FIRST pinned workspace is the
 * one the desk opens when the user enters Drumee
 * (desk _openWorkspaceOrEmptyScreen).
 *
 * STORED in the user's own settings (`drumate.update_settings`, the
 * yp.entity.settings JSON every device of the account reads at sign-in), under
 * one top-level key holding the switcher's own row keys — `hub:<hub_id>` for a
 * hub, `folder:<nid>` for a personal workspace (desk _workspaceKey). That
 * service merges at the TOP level only, so the whole array is always written
 * and nothing else in the settings is touched.
 *
 * Pure functions: nothing here reads Visitor or the network, so the desk and
 * the tests drive exactly the same code.
 */

const SETTINGS_KEY = "pinned_workspaces";

// A switcher key, nothing else. Anything that does not look like one — an old
// shape, a hand-edited value — is ignored rather than trusted.
const KEY_RE = /^(hub|folder):[^\s:]+$/;

/**
 * The pinned keys out of a settings object, cleaned: strings that look like
 * switcher keys, first occurrence wins.
 *
 * @param {Object} settings Visitor.settings()
 * @returns {Array<String>}
 */
function readPins(settings) {
  const raw = settings && settings[SETTINGS_KEY];
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const k of raw) {
    if (typeof k !== "string" || !KEY_RE.test(k) || out.includes(k)) continue;
    out.push(k);
  }
  return out;
}

/**
 * Pin `key` — NEWEST FIRST: it goes to the top, ahead of every older pin.
 * Re-pinning one already pinned moves it to the top.
 */
function pin(pins, key) {
  if (!key) return (pins || []).slice();
  return [key, ...(pins || []).filter((k) => k !== key)];
}

/** Unpin `key`. The others keep their order. */
function unpin(pins, key) {
  return (pins || []).filter((k) => k !== key);
}

/**
 * Move `key` to just before `beforeKey`, or to the end when `beforeKey` is
 * null. An unknown `key`, or a move onto itself, changes nothing.
 */
function move(pins, key, beforeKey) {
  const list = (pins || []).slice();
  if (!key || key === beforeKey || !list.includes(key)) return list;
  const rest = list.filter((k) => k !== key);
  if (beforeKey == null) return [...rest, key];
  const i = rest.indexOf(beforeKey);
  if (i === -1) return list;
  rest.splice(i, 0, key);
  return rest;
}

/**
 * Split the switcher's rows into the pinned ones (in pin order) and the rest
 * (in their own order).
 *
 * A pin whose workspace is not in `rows` — deleted, left, or not loaded — is
 * simply not shown. It is NOT dropped from `pins` here: an incomplete list
 * must never be what erases a user's pins. See prune().
 *
 * @param {Array} rows desk.home workspaces
 * @param {Array<String>} pins
 * @param {Function} keyOf row -> switcher key
 * @returns {{pinned: Array, rest: Array}}
 */
function split(rows, pins, keyOf) {
  const byKey = new Map();
  for (const r of rows || []) {
    const k = keyOf(r);
    if (k && !byKey.has(k)) byKey.set(k, r);
  }
  const pinned = [];
  const taken = new Set();
  for (const k of pins || []) {
    const r = byKey.get(k);
    if (!r || taken.has(k)) continue;
    taken.add(k);
    pinned.push(r);
  }
  const rest = (rows || []).filter((r) => !taken.has(keyOf(r)));
  return { pinned, rest };
}

/**
 * The pins that still name a workspace in `rows`. Used only when WRITING, and
 * only with a list that actually loaded — an empty `rows` keeps every pin,
 * because "the list failed to load" and "every workspace is gone" look the
 * same from here.
 */
function prune(pins, rows, keyOf) {
  if (!rows || !rows.length) return (pins || []).slice();
  const live = new Set(rows.map(keyOf).filter(Boolean));
  return (pins || []).filter((k) => live.has(k));
}

/** The workspace to land on: the first pinned one still listed, or null. */
function firstPinned(rows, pins, keyOf) {
  return split(rows, pins, keyOf).pinned[0] || null;
}

module.exports = {
  SETTINGS_KEY,
  readPins,
  pin,
  unpin,
  move,
  split,
  prune,
  firstPinned,
};
