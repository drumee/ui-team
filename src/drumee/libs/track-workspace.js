/**
 * Report a workspace the user just created, for the analytics Referral users
 * table (Workspaces column, and the Activated badge that now requires one).
 *
 * WHY THE CLIENT REPORTS THIS AT ALL. The obvious server-side count — hubs
 * owned — cannot see the whole picture. The create-workspace form's `personal`
 * type is a home-root FOLDER, not a hub: it never reaches yp.hub, so nothing
 * after the fact can tell it apart from any other folder. The client is the
 * only place that knows a workspace was what the user asked for.
 *
 * NEVER AWAITED, NEVER THROWS, NEVER BLOCKS. Callers open a permission panel
 * or navigate immediately afterwards; waiting on an analytics row would trade
 * a visible delay for a number on an admin dashboard. Guarded on the service
 * existing so a UI running against an older server quietly does nothing.
 *
 * The posted row is written by the router's `log` flag (acl/desk.json
 * track_workspace), and the handler pushes the caller's updated referral row
 * to any open dashboard — which is what makes the Workspaces column move
 * within a second rather than on the board's two-minute poll.
 *
 * `wid` MUST be the hub id, not actual_home_id: analytics-server's
 * backfill_workspace_track keys its NOT EXISTS guard on the hub id, so a live
 * row only suppresses the backfilled one when the two agree. Get it wrong and
 * the workspace is counted twice.
 *
 * @param {Object} ui      the widget doing the reporting (needs postService)
 * @param {String} type    "team" | "share" | "personal" — a LITERAL, not _a.*:
 *   the ACL declares it required and enum-checked, so resolving it through the
 *   attribute lexicon would turn a missing key into a silently dropped row.
 * @param {Object} opt     { wid, area, filename }
 * @returns {Promise<Object|null>} the service's answer, or null
 */
function trackWorkspace(ui, type, opt = {}) {
  if (!ui || typeof ui.postService !== "function") return Promise.resolve(null);
  if (typeof SERVICE === "undefined" || !SERVICE.desk || !SERVICE.desk.track_workspace) {
    return Promise.resolve(null);
  }
  try {
    return ui
      .postService(SERVICE.desk.track_workspace, {
        hub_id: Visitor.id,
        wid: opt.wid,
        type,
        area: opt.area,
        filename: opt.filename,
      })
      .catch(() => null);
  } catch (e) {
    /* tracking must never break workspace creation */
    return Promise.resolve(null);
  }
}

module.exports = { trackWorkspace };
