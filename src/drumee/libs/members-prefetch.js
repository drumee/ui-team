/**
 * The workspace-members read, started before the panel that wants it exists.
 *
 * Opening Access costs two network round trips in a row, and only the second
 * one is about data: the click starts a dynamic import() of the
 * `permission_restricted` chunk, the panel mounts when that lands, and its
 * onDomRefresh is what finally asks for the members. The work behind that
 * answer is ~1ms of database time — the wait is entirely latency, paid twice.
 *
 * So the click asks too. `prefetchMembers` is called from showAccessColumn
 * (window/folder/access-column) at the moment Access is pressed, and the
 * panel's _loadMembers then takes that answer through `membersFor` instead of
 * starting its own. The code download and the data fetch overlap, and the
 * panel's loading skeleton covers what is left.
 *
 * Started AT THE CLICK, deliberately, and consumed once: an answer fetched
 * when the window opened would be minutes old by the time somebody pressed
 * Access, and this panel is where an admin checks who can reach their files.
 * Nothing here is a cache — see libs/read-cache for that.
 *
 * `SERVICE` and the rest are read inside the functions, never at load, so this
 * can be required under plain node.
 */

// hub_id -> { pending, settled }. One entry per workspace, removed as soon as
// a panel takes it.
//
// `settled` is what keeps this a head start rather than a cache. An entry
// nobody took — Access pressed, the window closed before the chunk landed —
// is left parked here, and handing that answer to a click minutes later would
// show a permissions matrix from before whatever happened in between. Only a
// request still IN FLIGHT is shared; a settled one is replaced.
const inflight = new Map();

/** The read itself, on behalf of `view` (any widget: it needs fetchService).
 *
 *  Issued SYNCHRONOUSLY. The point of the whole module is that the request is
 *  on the wire while the chunk downloads, and starting it a microtask later —
 *  `Promise.resolve().then(...)` — hands that head start back for nothing. The
 *  try/catch is what a deferred call would have given: a fetchService that
 *  throws on the spot comes back as a rejection, like any other failure. */
function fetchMembers(view, hub_id) {
  try {
    return Promise.resolve(
      view.fetchService(SERVICE.hub.get_members_by_type, {
        hub_id,
        type: "all",
        // fetchService GETs put the payload in the URL with `cache: "default"`,
        // so without this the browser can answer a reopened panel with the rows
        // from before a role change. Same buster the panel's own call carries.
        _ts: Date.now(),
      }),
    );
  } catch (e) {
    return Promise.reject(e);
  }
}

/**
 * Start the members read for a workspace, if one is not already on its way.
 *
 * @returns {Promise|null} the answer in flight, or null when there is nothing
 *   to ask with (no workspace, or a view that cannot fetch)
 */
function prefetchMembers(view, hub_id) {
  if (!view || !hub_id || typeof view.fetchService !== "function") return null;
  const already = inflight.get(hub_id);
  if (already && !already.settled) return already.pending;

  const entry = { pending: fetchMembers(view, hub_id), settled: false };
  const done = () => {
    entry.settled = true;
  };
  // Also marks the promise handled: a prefetch nobody ends up taking must not
  // surface as an unhandled rejection. `entry.pending` itself is untouched, so
  // a panel that does take it still sees the failure.
  entry.pending.then(done, done);
  inflight.set(hub_id, entry);
  return entry.pending;
}

/** Hand over the answer this workspace's click started, once.
 *
 *  Settled or not: it is the answer to the click the panel is mounting for,
 *  and by the time a panel asks, the usual case is that it landed while the
 *  chunk was still downloading — which is the entire point. */
function takeMembers(hub_id) {
  const entry = inflight.get(hub_id);
  if (!entry) return null;
  inflight.delete(hub_id);
  return entry.pending;
}

/**
 * The members for a workspace: whatever the click already started, else a
 * fresh read.
 *
 * A prefetch that FAILED is not inherited. It runs earlier than the panel's
 * own call ever did, so it can lose a race the panel would win — a session
 * still settling, a token being refreshed — and a failed head start must not
 * cost the user the matrix. The panel asks again itself.
 */
function membersFor(view, hub_id) {
  const pending = takeMembers(hub_id);
  if (!pending) return fetchMembers(view, hub_id);
  return pending.catch(() => fetchMembers(view, hub_id));
}

module.exports = { prefetchMembers, membersFor, takeMembers };
