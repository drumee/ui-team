const { button } = require("../../../../skeleton/toolkit/buttons");
const __media_skl_grid = function (ui) {
  const type = ui.mget(_a.type);

  const opt = {
    kind: _a.media,
    type,
    logicalParent: ui,
    role: ui.mget(_a.role) || "",
    uiHandler: null,
  };

  if (ui.mget(_a.itemsOpt)) {
    _.merge(opt, ui.mget(_a.itemsOpt));
  }

  const list = Skeletons.List.Smart({
    className: `${ui.fig.group}__icons-list`,
    innerClass: `${ui.fig.group}__icons-scroll`,
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
    dataset: {
      role: _a.container,
    },
    spinnerWait: 1500,
    spinner: true,
    itemsOpt: opt,
    skip: {
      filename: /^\./,
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

  const cnWidowFilter = "window-filter";

  const FILTER_TABS = [
    { label: LOCALE.ALL, value: "all" },
    { label: LOCALE.DOCS, value: "docs" },
    { label: LOCALE.PDF, value: "pdf" },
    { label: LOCALE.IMAGES, value: "image" },
    { label: LOCALE.OTHER, value: "other" },
  ];

  const filterBar = Skeletons.Box.X({
    className: `${cnWidowFilter}__bar ${ui.fig.family}__filter-bar`,
    flow: _a.x,
    kids: FILTER_TABS.map((tab, index) =>
      button(ui, {
        label: tab.label,
        className: `${cnWidowFilter}__tab ${ui.fig.family}__filter-tab`,
        service: "filter-by-type",
        state: index === 0 ? 1 : 0,
        radiotoggle: `media-filter-${ui._id}`,
        value: tab.value,
      }),
    ),
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.group}__icons-container ${ui.fig.family}__icons-container`,
    kids: [
      filterBar,
      list,
    ]
  })
};

module.exports = __media_skl_grid;
