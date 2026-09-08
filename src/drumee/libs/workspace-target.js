/**
 * The payload `Wm.loadWorkspace` wants for one workspace row.
 *
 * A Personal workspace is not a hub — it is a home-root FOLDER, and it carries
 * a `home_id` pointing at the user's home ROOT. loadWorkspace resolves its node
 * as `actual_home_id || home_id || nid`, so handing it such a row raw makes it
 * prefer home_id and open Home instead of the folder the user clicked. Hence
 * the explicit shape, which drops home_id and pins the folder's own nid.
 *
 * SHARED on purpose. Two callers now resolve the same rows — the topbar
 * switcher (desk/index.js `_switchWorkspace`) and the home grid's tile click
 * (desk/wm/index.js, case "open-node") — and they are fed from the SAME
 * payload: both the grid's List.Smart and `_fetchWorkspaces` call
 * `SERVICE.desk.home` with `hub_id: Visitor.id`. A tile and its switcher row
 * are the same workspace, so they must resolve to the same target; a second
 * copy of these rules is how that quietly stops being true.
 *
 * @param {Object} row a desk.home row (hub or home-root folder)
 * @returns {Object|null} the loadWorkspace payload, or null for no row
 */
function workspaceTarget(row) {
  if (!row) return null;
  if (row.filetype === _a.folder) {
    return {
      hub_id: row.hub_id || Visitor.id,
      nid: row.nid || row.id,
      filename: row.filename,
      area: _a.personal,
    };
  }
  return { ...row };
}

module.exports = { workspaceTarget };
