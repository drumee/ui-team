/**
 * Creating a workspace, in one place.
 *
 * Lifted out of builtins/media/form (the create-workspace dialog) so a second
 * caller — the post-signup tutorial, which walks a brand-new account through
 * making its first workspace — can do it without restating any of it. What is
 * here is everything that is true whatever surface asked: which service each
 * type goes through, what gets tracked, and what gets broadcast. What is NOT
 * here is anything a surface decides for itself — validation copy, where the
 * error goes, what opens afterwards.
 *
 * THE THREE TYPES ARE NOT THREE FLAVOURS OF ONE CALL.
 *
 *   team      desk.create_hub, area `private`
 *   share     desk.create_hub, area `share`
 *   personal  NOT a hub at all. It is the legacy private folder at the home
 *             root, only PRESENTED as a workspace type, and it goes through
 *             the window manager's create-folder flow (media.make_dir). Using
 *             create_hub for it would give it membership and sidebar semantics
 *             this type must not have.
 *
 * That last one is why this file exists rather than a `area` lookup at the call
 * site: the branch carries its own service, its own tracking type, its own
 * broadcast shape and its own filename rules, and every one of those was
 * learned the hard way in the form this came from.
 */

// Hub types only. `personal` is deliberately absent — it has no area because
// it is not a hub, and putting it here invites someone to add a third row.
const HUB_AREA = {
  team: "private",
  share: "share",
};

/**
 * Report it to the analytics Referral users table. Never awaited, never throws
 * — see libs/track-workspace for why the client reports this at all.
 */
function track(host, type, opt) {
  return require("libs/track-workspace").trackWorkspace(host, type, opt);
}

/**
 * Tell the desk a workspace now exists.
 *
 * The descriptor is what listeners REOPEN the workspace from (the reward flow's
 * Step 3 does), so its shape matters per type:
 *
 *   hub       `nid` is the workspace ROOT node (actual_home_id). A hub's own
 *             `nid` is the hub/0 placeholder and would not open anything.
 *   personal  the user's own hub_id plus the folder's nid, which is the shape
 *             the sidebar builds for a folder row. A hub home_id here would
 *             reopen Home instead.
 *
 * `personal: 1` also tells listeners this type has no follow-up permission
 * panel, so they should finish rather than wait for one.
 */
function announce(workspace, personal) {
  const payload = { workspace };
  if (personal) payload.personal = 1;
  RADIO_BROADCAST.trigger("workspace:refresh", payload);
}

/**
 * A home-root folder wearing a workspace's clothes.
 *
 * Wm owns the filename rules and the make_dir call, and resolves the parent
 * from whatever workspace is open — which, during the post-signup tutorial, is
 * none, so it lands on the home root. That is exactly where a personal
 * workspace belongs.
 *
 * @returns {Promise<Object>} a normalised result
 */
function createPersonal(host, filename) {
  return Promise.resolve(Wm.createFolderFromDialog({ getValue: () => filename }))
    .then((created) => {
      // createFolderFromDialog resolves to the folder on success and undefined
      // on its own handled failures (invalid name, server error), having
      // already told the user. Anything but a real folder is a no-op here, or
      // callers would advance though nothing was created.
      if (!created || created.error) return { ok: false, handled: true };
      const workspace = {
        hub_id: Visitor.id,
        nid: created.nid || created.id,
        area: _a.personal,
        filename,
      };
      // A personal workspace is absent from yp.hub, so no amount of
      // server-side counting can find it. `type` is a literal, not _a.personal:
      // the ACL enum-checks it, and the lexicon would turn a missing key into a
      // silently dropped row.
      track(host, "personal", { wid: workspace.nid, area: _a.personal, filename });
      announce(workspace, true);
      return { ok: true, personal: true, workspace };
    });
}

/**
 * A real hub, private or shared.
 *
 * @returns {Promise<Object>} a normalised result — `{ok, hub, workspace}` on
 *   success, `{ok: false, quota: true}` when the server refused on quota, or
 *   `{ok: false, message}` with something worth showing the user.
 */
function createHub(host, type, filename, opt) {
  const area = HUB_AREA[type] || HUB_AREA.team;
  const target = opt.target || null;
  return host
    .postService(SERVICE.desk.create_hub, {
      area,
      filename,
      hub_id: Visitor.id,
      pid: target ? target.getCurrentNid() : Visitor.id,
    })
    .then((res) => {
      const hub = _.isArray(res) ? res[0] : res;
      // desk.create_hub can resolve with an in-band error payload instead of
      // rejecting.
      if (hub && (hub.error || hub.error_code)) {
        // LEGACY PATH. There is no workspace-count limit: the server's
        // check_quota preproc was removed on 2026-08-08 because it read the
        // plan's per-area capability flags as counts and refused a second
        // workspace to everyone, paying customers included. An updated endpoint
        // never sends this. Kept while endpoints roll out at their own pace: an
        // old service answers QUOTA_EXCEEDED with a `reason` naming the area
        // (_private_hub_limit_reached), which has no translation in any locale
        // file — so without this branch the code itself lands in the name field.
        if (hub.error === "QUOTA_EXCEEDED" || /_hub_limit_reached$/.test(hub.reason || "")) {
          return { ok: false, quota: true };
        }
        return { ok: false, message: LOCALE[hub.error] || hub.reason || hub.error };
      }
      const workspace = {
        hub_id: hub.hub_id || hub.id,
        nid: hub.actual_home_id || hub.home_id,
        area: hub.area || area,
        filename,
      };
      // `wid` is the hub id, not actual_home_id: the backfill that seeds the
      // analytics table from yp.hub keys on hub id, and the two must agree or a
      // backfilled workspace is counted twice.
      track(host, type, { wid: workspace.hub_id, area: workspace.area, filename });
      announce(workspace, false);
      return { ok: true, hub, workspace };
    });
}

/**
 * Create a workspace.
 *
 * Does the create, the tracking and the broadcast. Does NOT validate the name
 * beyond refusing an empty one, does not show anything, and does not decide
 * what happens next — every caller wants those differently, and the form and
 * the tutorial disagree about all three.
 *
 * @param {Object} host          a widget, for postService and warn
 * @param {String} type          "team" | "share" | "personal"
 * @param {String} name          the workspace name, untrimmed is fine
 * @param {Object} [opt]
 * @param {Object} [opt.target]  the active window, for a hub's parent nid
 * @returns {Promise<Object>} `{ok: true, workspace, hub?, personal?}` or
 *   `{ok: false, ...}` — `handled` when the failure has already been shown to
 *   the user, `quota` when the server refused on quota, `message` otherwise.
 *   Rejections are converted, so this settles rather than throws.
 */
function createWorkspace(host, type, name, opt = {}) {
  const filename = String(name || "").trim();
  if (!filename) return Promise.resolve({ ok: false, empty: true });
  const run = type === "personal"
    ? createPersonal(host, filename)
    : createHub(host, type, filename, opt);
  return run.catch((e) => {
    if (host && host.warn) host.warn("Failed to create workspace", e);
    return { ok: false, error: e };
  });
}

module.exports = { createWorkspace, HUB_AREA };
