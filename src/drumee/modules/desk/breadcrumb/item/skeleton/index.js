/* ==================================================================== *
* Widget skeleton automatically generated on 2026-04-01T14:02:19.133Z
* npm run add-widget -- --fig=breadcrumb.item --dest=src/drumee/modules/desk/breadcrumb/item
* ==================================================================== */

/**
 * 
 * @param {*} ui 
 * @returns 
 */

module.exports = function (ui) {
  const filename = ui.mget(_a.filename);

  let folderIcon = 'raw-drumee-folder-blue';
  let iconColor = 'blue';
  if (ui.mget(_a.filetype) == _a.hub) {
    iconColor = ui.mget(_a.area);
    switch (ui.mget(_a.kind)) {
      case 'window_team':
        folderIcon = 'raw-drumee-folder-purple';
        break;
      case 'window_sharebox':
        folderIcon = 'raw-drumee-folder-orange';
        break;
      case 'window_website':
        folderIcon = 'raw-drumee-folder-green';
        break;
    }
  }

  let nid = ui.mget(_a.nid);
  let pid = ui.mget(_a.pid);
  if (ui.mget(_a.filetype) == _a.hub) {
    nid = ui.mget(_a.home_id);
    pid = "0";
  }
  const pfx = ui.fig.family;
  let index = ui.getIndex()
  return Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__main`,
    dataset: { current: ui.mget("isCurrent") ? 1 : 0 },
    uiHandler: [ui],
    filetype: ui.mget(_a.filetype),
    home_id: ui.mget(_a.home_id),
    filename,
    filepath: ui.mget(_a.filepath),
    nid,
    hub_id: ui.mget(_a.hub_id),
    pid,
    service: _a.browse,
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Note({
        content: "›",
        className: `${pfx}__separator`,
      }),
      Skeletons.Note({
        content: filename,
        className: `${pfx}__filename`
      })
    ]
  });
}