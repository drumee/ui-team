const { dropdownMenuButton } = require("./dropdown-btn");

const _icons_list = function (ui) {
  return Skeletons.List.Smart({
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

      _icons_list(ui),

      { kind: "selection", sys_pn: "ref-selection" },

      Skeletons.Wrapper.Y({
        sys_pn: "windows-layer",
        className: `${ui.fig.family}__layer ${ui.fig.group}__layer`,
        sortWithCollection: false,
      }),
      Skeletons.Wrapper.Y({
        sys_pn: "headless-layer",
        className: `${ui.fig.family}__layer ${ui.fig.group}__layer headless`,
        sortWithCollection: false,
      }),

      Skeletons.Wrapper.Y({
        className: `${ui.fig.family}__wrapper-tooltips ${ui.fig.group}__wrapper-tooltips`,
        name: "tooltips",
      }),

      Skeletons.Wrapper.Y({
        className: `${ui.fig.family}__wrapper-modal ${ui.fig.group}__wrapper-modal`,
        name: "modal",
      }),

    ],
  });

  return a;
};

module.exports = ___window_manager;
