/**
 * Which invite popup the desk opens for an "invite-member" click.
 *
 * WORKSPACE SCOPE (Figma 785:74990 / 821:36883) only for the SIDEBAR's Invite
 * row — sys_pn "sidebar-invite". Every other caller of the same service keeps
 * the organisation-wide popup with its "Invite to" tree: the guided tours'
 * Step 2 selectors are written against that popup, and the topbar and
 * context-menu entries were not part of the workspace design.
 *
 * And only inside a real, named workspace. The personal home (hub_id is the
 * user's own id) is not one, and a workspace with no resolvable name would
 * title a half-empty card — both fall back to the org popup.
 *
 * The name is resolved the way the desk breadcrumb resolves it: the cached
 * workspace row by hub_id, then the window manager's own name for a workspace
 * reached by deep link.
 *
 * Pure (no globals) so it is tested without the desk.
 *
 * @param {Object}  p
 * @param {Object}  p.cmd       the widget that fired "invite-member"
 * @param {Object}  p.ws        Wm._curWorkspace — {hub_id, nid, area}
 * @param {Array}   p.rows      the desk's cached workspace rows
 * @param {String}  p.visitorId Visitor.id (the personal home's hub_id)
 * @param {String}  p.wmName    the window manager's hub_name / filename
 * @returns {Object} {scope, hub_name, hub_area} to spread into the feed, or {}
 */
function inviteWorkspaceScope({ cmd, ws, rows, visitorId, wmName }) {
  const fromSidebar =
    !!cmd && typeof cmd.mget === "function" && cmd.mget("sys_pn") === "sidebar-invite";
  if (!fromSidebar || !ws || !ws.hub_id || String(ws.hub_id) === String(visitorId)) {
    return {};
  }
  const row = (rows || []).find((r) => String(r.hub_id || r.id) === String(ws.hub_id));
  const name = (row && (row.filename || row.name)) || wmName || "";
  if (!name) return {};
  return { scope: "workspace", hub_name: name, hub_area: (row && row.area) || ws.area || "" };
}

module.exports = { inviteWorkspaceScope };
