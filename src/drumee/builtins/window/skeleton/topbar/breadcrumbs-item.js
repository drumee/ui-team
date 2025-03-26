const __breadcrumbs_item = function (_ui_, item) {
  const filename = item.filename || item.name;

  let folderIcon = 'raw-drumee-folder-blue';
  let iconColor = 'blue';
  if (item.filetype == _a.hub) {
    iconColor = item.area;
    switch (_ui_.mget(_a.kind)) {
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

  let nid = item.nid;
  let pid = item.pid;
  if (item.filetype == _a.hub) {
    nid = item.home_id;
    pid = "0";
  }

  const a = Skeletons.Box.X({
    debug: __filename,
    className: `${_ui_.fig.group}-breadcrumbs__item`,
    uiHandler: [_ui_],
    filetype: _a.folder,
    home_id: item.home_id,
    service: "open-node",
    filename,
    filepath: item.filepath,
    nid,
    hub_id: item.hub_id,
    pid,
    kidsOpt: {
      active: 0
    },
    kids: [
      Skeletons.Button.Svg({
        ico: folderIcon,
        className: `${_ui_.fig.group}-breadcrumbs__item--icon ${iconColor}`
      }),

      Skeletons.Note({
        content: filename,
        className: `${_ui_.fig.group}-breadcrumbs__item--filename filename`
      })
    ]
  });
  return a;
};

module.exports = __breadcrumbs_item;
