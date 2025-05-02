const __media_skl_row = function (_ui_) {
  let a;
  const type = _ui_.mget(_a.type);
  const pfx = `${_ui_.fig.group}__filter`;

  const header = Skeletons.Box.G({
    className: `${pfx}__main`,
    kids: [
      Skeletons.Box.X(),
      Skeletons.Box.X(),
      Skeletons.Button.Label({
        ico: 'arrow-up',
        className: `${pfx}__column name`,
        labelClass: `${pfx}__label name`,
        label: LOCALE.NAME,
        service: _e.sort,
        state: 0,
        name: _a.filename,
        icons:["arrow-up", "arrow-down"]
      }),
      Skeletons.Button.Label({
        ico: 'arrow-down',
        className: `${pfx}__column date`,
        labelClass: `${pfx}__label date`,
        label: LOCALE.LAST_CHANGE,
        service: _e.sort,
        state: 0,
        name: _a.mtime,
        icons:["arrow-down", "arrow-up"]
      }),
      Skeletons.Button.Label({
        ico: 'arrow-down',
        className: `${pfx}__column size`,
        labelClass: `${pfx}__label size`,
        label: LOCALE.SIZE,
        service: _e.sort,
        state: 0,
        name: _a.filesize,
        icons:["arrow-down", "arrow-up"]
      }),
      Skeletons.Button.Label({
        ico: 'arrow-down',
        className: `${pfx}__column type`,
        labelClass: `${pfx}__label type`,
        label: LOCALE.TYPE,
        service: _e.sort,
        state: 0,
        name: _a.ext,
        icons:["arrow-down", "arrow-up"]
      })
    ]
  });

  const list = Skeletons.List.Smart({
    className: `${_ui_.fig.group}__content-row`,
    innerClass: "drive-content-scroll",
    sys_pn: _a.list,
    flow: _a.none,
    timer: 2000,
    uiHandler: null,
    dataset: {
      role: _a.container,
    },
    skip:{
      filename : /^\./
    },
    itemsOpt: {
      kind: 'media_row',
      flow: _a.x,
      service: _ui_.mget('itemService') || 'open-node',
      type,
      role: _ui_.mget(_a.role) || '',
      logicalParent: _ui_
    },
    vendorOpt: Preset.List.Orange_e,
    api: _ui_.getCurrentApi
  });
  
  if(localStorage.getItem("showHidden")){
    delete list.skip;
  }

  return a = Skeletons.Box.Y({
    debug: __filename,
    className: `${_ui_.fig.group}__content-main`,
    kids: [
      header,
      list
    ]
  });
};

module.exports = __media_skl_row;