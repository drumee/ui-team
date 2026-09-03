/* ==================================================================== *
 * desk_breadcrumb skeleton
 * Renders a flat horizontal list of path items with › separators.
 * Each item delegates "open-node" to the source window.
 * ==================================================================== */

module.exports = function (ui, data = []) {
  const pfx = ui.fig.family;
  const items = [];
  if (!_.isArray(data)) data = [data]
  data.forEach((item, i) => {
    if (item && (item.filename || item.name)) {
      items.push({ ...item, kind: "desk_breadcrumb_item", service: "breadcrum-jump", isCurrent: i === data.length - 1 });
    }
  });
  return Skeletons.Box.X({
    className: `${pfx}__main`,
    debug: __filename,
    kids: [
      // NO Home crumb. It existed only to reach the legacy all-workspaces
      // grid (`load-home` → Wm.reload()), and that screen is retired: the 2.0
      // shell is always INSIDE a workspace — its rail (Files / Chat / Task /
      // Meet / Access) all act on an open one, so "no workspace" is not a
      // state it can render (see Desk._restoreDeskState, which lands on a
      // workspace rather than an empty desk). A crumb whose only destination
      // is a retired screen is worse than no crumb, so the track now starts
      // at the workspace: <Workspace> › <Folder> › …
      Skeletons.Box.X({ className: `${pfx}__content`, sys_pn: _a.content, kids: items })
    ],
  });
};
