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

const inFlight = new Map();

const keyOf = (hub_id, nid) => `${hub_id || ""}:${nid || ""}`;

/**
 * @param {Object} view   any widget (supplies fetchService + its auth context)
 * @param {Object} params { nid, hub_id }
 * @returns {Promise<Array>} the path rows, newest caller gets its own copy
 */
function getPath(view, params = {}) {
  const { nid, hub_id } = params;
  // Without both keys the server can only answer for "undefined" — let the
  // caller's own guard deal with it rather than caching a bad key.
  if (!nid || !hub_id) return view.fetchService(SERVICE.media.get_path, params);

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
  return p.then((data) => (_.isArray(data) ? data.slice() : data));
}

module.exports = { getPath };
