const { button } = require("../../../../skeleton/toolkit/buttons");
const { createMenu } = require("../../../skeleton/toolkit/index");
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
    timer: 2000,
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
    api: ui.getCurrentApi,
  });

  if (localStorage.getItem("showHidden")) {
    delete list.skip;
  }

  const cnWidowFilter = "window-filter";

  // value: filetype param sent to BE (null = no filter)
  // Mapped from api-response ftype field: image, video, audio, document, note, text
  const FILTER_TABS = [
    { label: "All", value: "all" },
    { label: "Docs", value: "docs" },
    { label: "PDF", value: "pdf" },
    { label: "Images", value: "image" },
    { label: "Other", value: "other" },
  ];

  const filterBar = Skeletons.Box.X({
    className: `${cnWidowFilter}__bar`,
    flow: _a.x,
    kids: FILTER_TABS.map((tab, index) =>
      button(ui, {
        label: tab.label,
        className: `${cnWidowFilter}__tab`,
        service: "filter-by-type",
        state: index === 0 ? 1 : 0,
        radiotoggle: `media-filter-${ui._id}`,
        value: tab.value,
        // filetype: tab.value,
      }),
    ),
  });

  const isVisible = ui.fig.name !== "trash";

  const a = {
    kind: KIND.box,
    debug: __filename,
    flow: _a.y,
    className: `${ui.fig.group}__icons-container`,
    kids: [
      filterBar,
      list,
      ...(isVisible
        ? [
          createMenu(ui, {
            triggerIco: "editbox_list-plus",
            sys_pn: "create-menu",
            items: [
              { service: "meeting", ico: "dock-note", content: "Note" },
              {
                service: "webinar",
                ico: "raw-documents_word",
                content: "Document",
              },
              {
                service: "channel",
                ico: "raw-documents_excel",
                content: "Spreadsheet",
              },
              {
                service: "channel",
                ico: "raw-documents_powerpoint",
                content: "Presentation",
              },
              { service: "channel", ico: "dock-folder", content: "Folder" },
            ],
          }),
        ]
        : []),
    ],
  };

  return a;
};

module.exports = __media_skl_grid;
