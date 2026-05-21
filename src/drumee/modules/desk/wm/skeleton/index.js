const { dropdownMenuButton } = require("./dropdown-btn");

const _icons_list = function (ui) {
  const a = Skeletons.List.Smart({
    className: `${ui.fig.family}__icons-list`,
    innerClass: `${ui.fig.family}__icons-scroll ${ui.fig.group}__icons-scroll`,
    sys_pn: _a.list,
    flow: _a.none,
    timer: 1000,
    spinnerWait: 1000,
    spinner: true,
    vendorOpt: Preset.List.Orange_e,
    itemsOpt: {
      kind: "media",
      service: "open-node",
      on_start: "open-node",
      uiHandler: [ui],
    },
    api: {
      service: SERVICE.desk.home,
      hub_id: Visitor.id,
    },
  });
  if (Visitor.isMobile()) {
    a.style = {
      ...a.style,
      height: window.innerHeight - 160,
    };
  }

  return a;
};

// ======================================================
// Desk content ui
// ======================================================

const ___window_manager = function (ui) {
  let bugReportLabel = LOCALE.REPORT_BUG;
  if (Visitor.get("is_support")) {
    bugReportLabel = LOCALE.BUG_REPORTS;
  }

  const cnWindowMangerActions = `${ui.fig.family}-actions`;
  let headless = 0;
  if (ui.mget(_a.headless)) {
    headless = 1;
  }
  const a = Skeletons.Box.Y({
    sys_pn: "wm-container",
    className: `${ui.fig.family}__main desk-window-wrapper`,
    debug: __filename,
    styleOpt: {
      height: _K.size.full,
    },
    kids: [
      Skeletons.FileSelector({
        partHandler: ui,
      }),

      // Skeletons.Box.X({
      //   className: `${ui.fig.family}-actions__buttons-wrapper`,
      //   kids: [
      //     dropdownMenuButton(ui, {
      //       className: cnWindowMangerActions,

      //       trigger: Skeletons.Button.Label({
      //         className: `${cnWindowMangerActions}__label-button secondary`,
      //         label: "Add new",
      //         ico: "editbox_list-plus",
      //         uiHandler: ui,
      //         partHandler: ui,
      //       }),

      //       menuItems: [
      //         {
      //           service: "new-sub-folder",
      //           ico: "dock-folder",
      //           content: LOCALE.NEW_SUB_FOLDER,
      //         },
      //         {
      //           service: "new-workspace",
      //           ico: "desktop_desktop",
      //           content: LOCALE.NEW_WORKSPACE,
      //         },
      //         {
      //           service: "new-file",
      //           ico: "desktop_docfile",
      //           content: LOCALE.NEW_FILE,
      //         },
      //       ],
      //     }),
      //   ],
      // }),

      _icons_list(ui),

      { kind: "selection", sys_pn: "ref-selection" },

      Skeletons.Wrapper.Y({
        sys_pn: "windows-layer",
        className: `${ui.fig.family}__layer ${ui.fig.group}__layer`,
        sortWithCollection: false,
        dataset: { headless }

      }),

      Skeletons.Wrapper.Y({
        className: `${ui.fig.family}__wrapper-tooltips ${ui.fig.group}__wrapper-tooltips`,
        name: "tooltips",
      }),

      Skeletons.Wrapper.Y({
        className: `${ui.fig.family}__wrapper-modal ${ui.fig.group}__wrapper-modal`,
        name: "modal",
      }),

      // Skeletons.Box.X({
      //   kids: [{ kind: "dock", sys_pn: "dock" }],
      // }),
    ],
  });

  return a;
};

module.exports = ___window_manager;
