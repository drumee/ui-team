/**
 * The workspace taxonomy, in one place.
 *
 * Three surfaces list the same workspaces and must not disagree about which
 * heading a `restricted` or `dmz` one belongs under: the desktop topbar
 * switcher, the phone's workspace sheet, and the invite popup's workspace
 * picker. This lived as desk_module._groupWorkspaces while there were two of
 * them — both reached it through the desk instance — and moved here when the
 * invite popup, which holds no reference to the desk, became the third.
 *
 * desk_module._groupWorkspaces still exists and delegates here, so its
 * existing callers (including mobile-sheets' `ui._groupWorkspaces`) are
 * unchanged.
 */

/**
 * Split workspace rows into the types the user chose when creating them.
 *
 * The vocabulary is the CREATE DIALOG's, not a new one invented here —
 * tutorial/skeleton/toolkit/workspace-dialog TYPES maps internal -> private,
 * external -> share, personal -> a home-root folder. Listing a workspace
 * under the type it was created as is the whole point; a second, different
 * taxonomy would be worse than none.
 *
 * `dmz` joins External because it is the share area's variant — window/hub.js
 * openSettings already treats the two as one case. `restricted` joins
 * Internal: wm/index.js calls {share, private, restricted, public} the
 * collaborative set, and restricted is the one that is not outward-facing.
 *
 * FOLDERS are personal whatever their area says: _fetchWorkspaces only
 * defaults a missing area to `personal`, so filetype is the reliable test.
 *
 * Nothing is ever dropped. A row matching no rule keeps the generic
 * "Workspaces" heading at the end rather than vanishing — this menu is the
 * only global way to change workspace, so an unlisted one is unreachable,
 * not merely unlabelled. That is what makes a new area on the server a
 * cosmetic problem here instead of a functional one.
 *
 * @param {Array} rows desk.home workspaces, already ordered
 * @returns {Array} [{ label, rows }] — empty groups omitted
 */
function groupWorkspaces(rows) {
  const isFolder = (r) => r.filetype === _a.folder;
  const inArea = (...areas) => (r) => !isFolder(r) && areas.includes(r.area);
  const defs = [
    { label: LOCALE.INTERNAL, match: inArea(_a.private, _a.restricted) },
    { label: LOCALE.EXTERNAL, match: inArea(_a.share, _a.dmz) },
    { label: LOCALE.PUBLIC, match: inArea(_a.public) },
    { label: LOCALE.PERSONAL, match: isFolder },
  ];
  const groups = defs.map((d) => ({ label: d.label, rows: [] }));
  const rest = [];
  for (const r of rows || []) {
    const i = defs.findIndex((d) => d.match(r));
    if (i === -1) rest.push(r);
    else groups[i].rows.push(r);
  }
  if (rest.length) groups.push({ label: LOCALE.WORKSPACES, rows: rest });
  return groups.filter((g) => g.rows.length);
}

module.exports = { groupWorkspaces };
