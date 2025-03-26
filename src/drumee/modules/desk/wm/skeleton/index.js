
const _icons_list = function (_ui_) {
  const a = Skeletons.List.Smart({
    className: `${_ui_.fig.family}__icons-list`,
    innerClass: `${_ui_.fig.family}__icons-scroll ${_ui_.fig.group}__icons-scroll`,
    sys_pn: _a.list,
    flow: _a.none,
    timer: 1000,
    spinnerWait: 1000,
    spinner: true,
    vendorOpt: Preset.List.Orange_e,
    itemsOpt: {
      kind: "media",
      role: "desk",
      service: "open-node",
      on_start: "open-node",
      uiHandler: [_ui_]
    },
    api: {
      service: SERVICE.desk.home,
      hub_id: Visitor.id,
    },
  });
  if (Visitor.isMobile()) {
    a.style = {
      ...a.style,
      height: window.innerHeight - 160
    }
  }

  return a;
};

// ======================================================
// Desk content _ui_
// ======================================================

const ___window_manager = function (_ui_) {
  let bugReportLabel = LOCALE.REPORT_BUG;
  if (Visitor.get("is_support")) {
    bugReportLabel = LOCALE.BUG_REPORTS;
  }


  const a = Skeletons.Box.Y({
    sys_pn: "wm-container",
    className: `${_ui_.fig.family}__main desk-window-wrapper`,
    debug: __filename,
    styleOpt: {
      height: _K.size.full,
    },
    kids: [
      Skeletons.FileSelector({
        partHandler: _ui_,
      }),

      _icons_list(_ui_),

      { kind: "selection", sys_pn: "ref-selection" },

      Skeletons.Wrapper.Y({
        sys_pn: "windows-layer",
        className: `${_ui_.fig.family}__layer ${_ui_.fig.group}__layer`,
        sortWithCollection: false,
      }),

      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__wrapper-tooltips ${_ui_.fig.group}__wrapper-tooltips`,
        name: "tooltips",
      }),

      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__wrapper-modal ${_ui_.fig.group}__wrapper-modal`,
        name: "modal",
      }),

      Skeletons.Box.X({
        kids: [
          { kind: "dock", sys_pn: "dock" },
        ],
      }),
    ],
  });

  return a;
};

module.exports = ___window_manager;
