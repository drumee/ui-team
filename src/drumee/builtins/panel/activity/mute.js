// Notification popup mute — Round 3 Phase 3, the CHAT half (xlsx row 6).
//
// 🚨 THIS SUPPRESSES POPUPS AND NOTHING ELSE. A muted user keeps every row in
// the Notification Center, keeps the unread badge and keeps the tab counts —
// they simply stop being interrupted by a card. Muting is "stop talking to
// me", not "stop recording". Nothing here may be consulted by the feed, by
// `unread_counts`, or by any row-rendering path.
//
// WHY THE STATE IS CACHED HERE RATHER THAN ASKED FOR PER MESSAGE. A per-push
// lookup would put a request on the chat path at typing rate, and — worse —
// would make whether a card appears depend on a round trip that can fail
// silently. That is exactly the trap the folder chip fell into in Phase 2
// (trap 37): a failure nobody can observe is a failure nobody can debug. The
// state is read once when the panel boots and refreshed from the RETURN VALUE
// of every mute_set, so the common case costs no extra request at all.
//
// IT FAILS OPEN, DELIBERATELY. Before the schema is applied, on a stale server
// with no such service, or after any error, the answer is "nothing is muted"
// and popups behave exactly as they do today. The opposite default would let
// one failed request silence a user's notifications with no way to tell why.

// Session cache. `hubs` holds the individually muted workspace ids; `global`
// means every workspace. The server clears the per-workspace rows when a
// global mute is written, so the two do not layer — but `isPopupMuted` treats
// global as decisive rather than relying on that.
const STATE = { loaded: 0, global: 0, hubs: new Set() };

/**
 * Fold a server payload into the cache. Shared by the initial load and by
 * every mute_set, so the two can never disagree about how a payload is read.
 */
function applyMuteState(d) {
  if (!d || typeof d !== 'object') return STATE;
  STATE.global = d.global ? 1 : 0;
  STATE.hubs = new Set((Array.isArray(d.hubs) ? d.hubs : []).map((h) => String(h)));
  STATE.loaded = 1;
  return STATE;
}

function muteState() {
  return STATE;
}

/**
 * Reset the cache. Exported for the test suite and for sign-out, where the
 * next user must not inherit the previous one's mutes.
 */
function resetMuteState() {
  STATE.loaded = 0;
  STATE.global = 0;
  STATE.hubs = new Set();
  return STATE;
}

/**
 * Resolve a service name defensively: SERVICE is merged from the server's ACL
 * at boot, so a client running against a server that predates these endpoints
 * has no entry at all. Posting to `undefined` would be a request to the wrong
 * place, so the caller is told to do nothing instead.
 */
function muteService(name) {
  try {
    return (typeof SERVICE !== 'undefined' && SERVICE.activity && SERVICE.activity[name]) || null;
  } catch (e) {
    return null;
  }
}

/**
 * Read the caller's mute state once, at panel boot.
 * Never throws and never rejects — the panel must come up either way.
 */
async function loadMuteState(host) {
  try {
    const svc = muteService('mute_state');
    if (!svc || !host || !host.fetchService) return STATE;
    return applyMuteState(await host.fetchService(svc, {}));
  } catch (e) {
    return STATE;
  }
}

/**
 * Should the popup for this push be suppressed?
 *
 * A workspace-less push (a p2p DM carries no workspace) can only be silenced
 * by a global mute — there is no per-workspace row that could match it.
 */
function isPopupMuted(model = {}) {
  try {
    if (STATE.global) return true;
    const id = model.hub_id == null ? '' : String(model.hub_id);
    return !!id && STATE.hubs.has(id);
  } catch (e) {
    return false;
  }
}

/**
 * Mute or unmute one workspace (`hub_id`) or all of them (empty `hub_id`).
 *
 * Returns `{ ok }`. `ok` is false when the write did not land — the server
 * reports that honestly because its driver swallows SQL errors and returns
 * undefined rather than throwing. The caller must not show a confirmation
 * unless `ok`, or it would tell the user something is muted when it is not.
 *
 * The cache is updated ONLY from a successful response, and from the response
 * itself rather than from what we asked for, so it can never drift from what
 * the database actually holds.
 */
async function setMute(host, hub_id, muted = true) {
  const svc = muteService('mute_set');
  if (!svc || !host || !host.postService) return { ok: false };
  try {
    const d = await host.postService(svc, {
      hub_id: String(hub_id == null ? '' : hub_id),
      // 1/0 rather than true/false: these travel as form values, and the
      // server treats the STRINGS '0' and 'false' as unmute for that reason.
      muted: muted ? 1 : 0,
    });
    const ok = !!d && d.status === 'ok';
    if (ok) applyMuteState(d);
    return { ok, data: d };
  } catch (e) {
    return { ok: false };
  }
}

/**
 * How many workspaces does this user actually have?
 *
 * Used for one thing only: when there is exactly ONE, "this workspace" and
 * "all workspaces" mute the same thing, so the picker collapses to a single
 * Mute button rather than asking a question with two identical answers.
 *
 * 🚨 IT FAILS TO "UNKNOWN", AND UNKNOWN MEANS SHOW BOTH. The two failure modes
 * are not symmetric: showing two options to a one-workspace user is merely
 * redundant, while showing ONE option to a user who has several would mute a
 * scope they did not choose. So anything short of proof — a failed request, an
 * older server, an unexpected shape — leaves the full picker in place.
 *
 * FETCHED LAZILY, on the first Mute click, and cached for the session. Putting
 * it in the panel's boot would spend a request on every user who never opens
 * the picker.
 *
 * THE FILTER MIRRORS THE SIDEBAR'S (desk/workspace-list onPartReady): a
 * `folder` row is a personal workspace, a `hub` row counts only in a real
 * area, and anything else is not a workspace. Kept deliberately in step with
 * that rule — if the sidebar's definition changes, this has to change with it.
 *
 * PAGINATION IS NOT A HAZARD HERE. desk.home is paged, but the only question
 * asked is "is it exactly one", and a user with more than one has more than
 * one on the first page.
 */
let WORKSPACE_COUNT = null; // null = not asked yet / unknown

function isWorkspaceRow(it) {
  if (!it) return false;
  const ft = it.filetype;
  if (ft === 'folder') return true;
  if (ft === 'hub') return /^(share|private|restricted|public)$/.test(String(it.area || ''));
  return false;
}

async function workspaceCount(host) {
  if (WORKSPACE_COUNT != null) return WORKSPACE_COUNT;
  try {
    const svc = (typeof SERVICE !== 'undefined' && SERVICE.desk && SERVICE.desk.home) || null;
    if (!svc || !host || !host.fetchService) return null;
    const rows = await host.fetchService(svc, { hub_id: Visitor.id, type: 'node' });
    // Documentation, not protection: a non-array would throw on .filter below
    // and the catch would return null anyway, so deleting this line changes
    // nothing observable (a mutation run confirmed that). It states the shape
    // this function requires rather than leaving it to an exception.
    if (!Array.isArray(rows)) return null;
    WORKSPACE_COUNT = rows.filter(isWorkspaceRow).length;
    return WORKSPACE_COUNT;
  } catch (e) {
    return null;
  }
}

function resetWorkspaceCount() {
  WORKSPACE_COUNT = null;
}

module.exports = {
  loadMuteState,
  isPopupMuted,
  setMute,
  muteState,
  applyMuteState,
  resetMuteState,
  muteService,
  workspaceCount,
  resetWorkspaceCount,
  isWorkspaceRow,
};
