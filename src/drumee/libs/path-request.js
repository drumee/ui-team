/**
 * Collapse the duplicate `media.get_path` calls a single window-open fires.
 *
 * Opening a folder asks the server for the SAME node path two or three times,
 * from callers that don't know about each other: `Wm.loadWorkspace` (to feed
 * `refreshBreadcrumbsUI`), `desk_breadcrumb._updatePath` (to paint the topbar),
 * and `window_folder._resolveMissingTitle` when the title arrives blank. They
 * fire within a few milliseconds of each other with identical arguments.
 *
 * That is not just wasted work. `mfs_get_path` builds a TEMPORARY table per
 * call, and two identical calls landing together on the endpoint measured
 * 173 ms for the first and 404 ms (and, on a cold endpoint, 3013 ms) for its
 * twin — the duplicate is slower than the original and it delays everything
 * queued behind it, including the folder's own content listing.
 *
 * De-duplication is IN-FLIGHT ONLY: callers that ask while a request for the
 * same (hub_id, nid) is still open share its promise, and the entry is dropped
 * as soon as it settles. Nothing is cached across the gap, so a rename, a move
 * or a permission change is picked up by the next call exactly as before —
 * this cannot serve stale path data.
 *
 * Each caller gets its own copy of the resolved list, so one caller mutating
 * its result (refreshBreadcrumbsUI reshapes rows) can't corrupt another's.
 */

const readCache = require("./read-cache");

const inFlight = new Map();

const keyOf = (hub_id, nid) => `${hub_id || ""}:${nid || ""}`;
const cacheKeyOf = (key) => `media.get_path:${key}`;

// Rows are remembered and handed out as DEEP copies: refreshBreadcrumbsUI
// reshapes what it is given, and a shared row object would let one caller's
// reshaping leak into the next paint.
const copy = (rows) => JSON.parse(JSON.stringify(rows));

/**
 * Always answer with an ARRAY of rows.
 *
 * A path of exactly ONE row does not come back as a one-element array — this
 * server collapses a single-row result set into the row OBJECT itself (the
 * same shape desk_module._fetchWorkspaces normalises for). And one row is not
 * an edge case here: it is every workspace ROOT, because mfs_get_path's
 * recursion stops at `parent_id = '0'`, so a workspace root is its own entire
 * path.
 *
 * Every caller then read that object as "no rows", each in its own way:
 * desk_breadcrumb takes the workspace name from `data[0].hub_name` (undefined
 * on an object, so a root whose user_filename is empty rendered NO crumb at
 * all — the workspace name went blank on every switch), and
 * window_folder.refreshBreadcrumbsUI guards on `_.isArray(stack)` and skipped
 * the `mset({hub_name})` that paints the window title — which is why
 * _resolveMissingTitle could never resolve the one case it exists for.
 *
 * Normalising here, at the one call every path reader shares, is what keeps
 * that from having to be remembered at each site.
 *
 * @param {Array|Object} data
 * @returns {Array} rows — a fresh array the caller may reshape freely
 */
const toRows = (data) => {
  if (_.isArray(data)) return data.slice();
  // Covers null/undefined and `{}`; a real row is never empty.
  if (_.isEmpty(data)) return [];
  return [data];
};

/**
 * PAINT FROM THE LAST ANSWER, THEN REVALIDATE.
 *
 * The in-flight sharing above removed the duplicate call; this removes the
 * WAIT. A node whose path this session has already resolved answers at once
 * with that path, and the fresh request still goes out — if it comes back
 * different (a rename, a move, a permission change) `onRevalidate` is handed
 * the new rows to paint over the first ones. The breadcrumb is the only reader,
 * and a crumb that is right after one round trip beats a crumb that is blank
 * for one: mfs_get_path is the 173 ms-3 s call documented above, and it sat on
 * the critical path of every workspace switch.
 *
 * A caller that passes no `onRevalidate` still gets the instant answer; the
 * revalidation just refreshes what the next caller sees.
 *
 * @param {Object} view   any widget (supplies fetchService + its auth context)
 * @param {Object} params { nid, hub_id }
 * @param {Function} [onRevalidate] rows → void, called only when a cached
 *   answer was returned AND the server's answer differs from it
 * @returns {Promise<Array>} the path rows, newest caller gets its own copy
 */
function getPath(view, params = {}, onRevalidate) {
  const { nid, hub_id } = params;
  // Without both keys the server can only answer for "undefined" — let the
  // caller's own guard deal with it rather than caching a bad key.
  if (!nid || !hub_id) {
    return view.fetchService(SERVICE.media.get_path, params).then(toRows);
  }

  const key = keyOf(hub_id, nid);
  let p = inFlight.get(key);
  if (!p) {
    p = view.fetchService(SERVICE.media.get_path, { nid, hub_id });
    inFlight.set(key, p);
    const drop = () => {
      // Only drop OUR entry: a later call for the same node may already have
      // replaced it.
      if (inFlight.get(key) === p) inFlight.delete(key);
    };
    p.then(drop, drop);
  }
  // Copy the array so sharing the promise never means sharing the array.
  const fresh = p.then((data) => {
    const rows = toRows(data);
    // Only a real answer is worth remembering: fetchService resolves
    // undefined on a failed or denied call, and toRows turns that into [].
    // An empty answer for a path we HAD is a node that is gone or no longer
    // ours — forget it, or its crumbs would be re-served for the session.
    if (rows.length) readCache.set(cacheKeyOf(key), copy(rows));
    else readCache.invalidate(cacheKeyOf(key));
    return rows;
  });

  const known = readCache.peek(cacheKeyOf(key));
  if (!known) return fresh;

  fresh
    .then((rows) => {
      if (!rows.length || !_.isFunction(onRevalidate)) return;
      if (readCache.same(rows, known)) return;
      try {
        onRevalidate(copy(rows));
      } catch (e) {
        // The caller's repaint failed; its first paint (from cache) stands.
      }
    })
    .catch(() => {
      // A failed revalidation changes nothing: the cached crumbs stay up, and
      // the next call asks again.
    });
  return Promise.resolve(copy(known));
}

module.exports = { getPath };
