const __media_skl_row = function (ui) {
  let a;
  const type = ui.mget(_a.type);
  const pfx = `${ui.fig.group}__filter`;

  const header = Skeletons.Box.G({
    className: `${pfx}__main`,
    kids: [
      Skeletons.Box.X(),
      Skeletons.Box.X(),
      Skeletons.Button.Label({
        ico: "arrow-up",
        className: `${pfx}__column name`,
        labelClass: `${pfx}__label name`,
        label: LOCALE.NAME,
        service: _e.sort,
        state: 0,
        name: _a.filename,
        icons: ["arrow-up", "arrow-down"],
      }),
      Skeletons.Button.Label({
        ico: "arrow-down",
        className: `${pfx}__column date`,
        labelClass: `${pfx}__label date`,
        label: LOCALE.LAST_CHANGE,
        service: _e.sort,
        state: 0,
        name: _a.mtime,
        icons: ["arrow-down", "arrow-up"],
      }),
      Skeletons.Button.Label({
        ico: "arrow-down",
        className: `${pfx}__column size`,
        labelClass: `${pfx}__label size`,
        label: LOCALE.SIZE,
        service: _e.sort,
        state: 0,
        name: _a.filesize,
        icons: ["arrow-down", "arrow-up"],
      }),
      Skeletons.Button.Label({
        ico: "arrow-down",
        className: `${pfx}__column type`,
        labelClass: `${pfx}__label type`,
        label: LOCALE.TYPE,
        service: _e.sort,
        state: 0,
        name: _a.ext,
        icons: ["arrow-down", "arrow-up"],
      }),
    ],
  });

  const list = Skeletons.List.Smart({
    className: `${ui.fig.group}__content-row`,
    innerClass: "drive-content-scroll",
    sys_pn: _a.list,
    flow: _a.none,
    // NO `timer:` HERE, DELIBERATELY. `timer: N` arms ui-core's tick() loop
    // (letc/widgets/list/index.js:194), which re-arms itself from renderData()
    // after every page and only stops at `_end_of_data`. On a busy folder that
    // means the grid silently walks the ENTIRE listing while the tab sits idle:
    // measured on preview, 27 media.show_node_by fetches for one folder, 2.17s
    // apart over 56s, ~1.3s of server time each, mounting ~1,200 media widgets
    // nobody asked for. That is the "open it, do nothing, it gets laggy and
    // crashes" report.
    //
    // Paging still works without it: _onScroll (list/index.js:517) is bound for
    // every List.Smart and fetches the next page when you actually reach the
    // bottom, with useMouseWheel() covering the not-yet-scrollable case. The
    // visible trade is that a folder now shows its first page and grows on
    // scroll, instead of filling itself in if you wait.
    uiHandler: null,
    dataset: {
      role: _a.container,
    },
    skip: {
      filename: /^\./,
    },
    itemsOpt: {
      kind: "media_row",
      flow: _a.x,
      service: ui.mget("itemService") || "open-node",
      type,
      role: ui.mget(_a.role) || "",
      logicalParent: ui,
    },
    vendorOpt: Preset.List.Orange_e,
    // List._initApi calls api(this) as a plain function (no `this` binding),
    // so a bare `ui.getCurrentApi` reference runs with this=undefined and
    // crashes on this.actualNode(). Wrap it so getCurrentApi is invoked as a
    // method on `ui` (same pattern as gridFilesBrowser's working api).
    api: function () {
      return ui.getCurrentApi();
    },
  });

  if (localStorage.getItem("showHidden")) {
    delete list.skip;
  }

  return (a = Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.group}__content-main`,
    kids: [header, list],
  }));
};

module.exports = __media_skl_row;
