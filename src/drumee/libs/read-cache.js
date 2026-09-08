/**
 * Session-scoped read cache for the "paint from what we already know, then
 * revalidate" pattern (stale-while-revalidate).
 *
 * WHY. Every service call goes out `cache: "no-cache"` (ui-essentials
 * socket/service.js) and nothing in the client remembers a response, so every
 * widget mount — a tab reopened, a workspace switched back to, a panel
 * re-shown — pays the full round trip before it can paint anything. The
 * listings behind those mounts are the slow ones (media.show_node_by ~800ms,
 * mfs_get_path 173ms-3s, task.list for a whole workspace), so the wait is
 * the lag users feel when they switch.
 *
 * WHAT THIS IS NOT. It is not a TTL cache and it never answers INSTEAD of the
 * server. A caller `peek()`s to paint immediately, then runs its normal fetch
 * and `set()`s the fresh rows, repainting only if they differ. The worst case
 * is one paint of last-known data, corrected as soon as the network answers —
 * which is exactly what a user who left a tab and came back expects to see.
 * Because nothing is served stale for longer than one round trip, no
 * invalidation wiring is needed on mutation paths.
 *
 * Values are stored as-is (callers hand in plain JSON rows) and handed back
 * as-is: `peek()` is for seeding a widget's own state, which the widget then
 * owns. A caller that mutates rows in place should store a copy.
 *
 * Bounded (LRU on insert) so a long session cannot grow it without limit.
 */

const MAX_ENTRIES = 300;
const store = new Map();

/**
 * @param {String} key
 * @returns {*} the cached value, or undefined
 */
function peek(key) {
  if (!store.has(key)) return undefined;
  const entry = store.get(key);
  // Refresh recency: Map iteration order is insertion order, so re-inserting
  // moves the key to the tail and the head is always the least recently used.
  store.delete(key);
  store.set(key, entry);
  return entry.value;
}

/**
 * @param {String} key
 * @param {*} value   plain data; `undefined` removes the entry
 */
function set(key, value) {
  if (value === undefined) {
    store.delete(key);
    return;
  }
  if (store.has(key)) store.delete(key);
  store.set(key, { value, at: Date.now() });
  if (store.size > MAX_ENTRIES) {
    store.delete(store.keys().next().value);
  }
}

/**
 * Drop one key, or every key under a prefix (`"tasks:HUB:"`).
 * @param {String} keyOrPrefix
 * @param {Boolean} [prefix]
 */
function invalidate(keyOrPrefix, prefix = false) {
  if (!prefix) {
    store.delete(keyOrPrefix);
    return;
  }
  for (const k of Array.from(store.keys())) {
    if (k.startsWith(keyOrPrefix)) store.delete(k);
  }
}

/**
 * Cheap structural equality for the "did the fresh rows change anything?"
 * check that gates a repaint. JSON order is stable for rows the server built
 * the same way, and a false "changed" only costs one extra render.
 * @returns {Boolean}
 */
function same(a, b) {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch (e) {
    return false;
  }
}

/**
 * Signature of a value, for callers that compare before/after around an
 * async gap without holding on to the old object.
 * @returns {String}
 */
function signature(value) {
  try {
    return JSON.stringify(value === undefined ? null : value);
  } catch (e) {
    return String(Math.random());
  }
}

/**
 * Forget everything. Keys are hub/nid-scoped with no user component, and a
 * sign-out on the main domain is a soft restart (Butler.logout → Drumee.start,
 * no page load) — so the next account must not inherit this one's rows.
 */
function clear() {
  store.clear();
}

module.exports = { peek, set, invalidate, clear, same, signature };
