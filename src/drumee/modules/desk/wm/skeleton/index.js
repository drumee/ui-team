const { dropdownMenuButton } = require("./dropdown-btn");

const _icons_list = function (ui) {
  const list = Skeletons.List.Smart({
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
    // Mobile chrome was previously assumed to consume 160px (legacy:
    // desktop topbar + sidebar + dock). The current mobile layout
    // only renders the 48px mobile-topbar above the WM, so subtract
    // just that — anything larger leaves a dead zone at the bottom
    // that visually overlapped the last row of cards.
    list.styleOpt = {
      ...list.styleOpt,
      height: window.innerHeight - 48,
    };
  }

  return list;
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

      {
        kind: "dock",
        sys_pn: "dock",
      },

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
        sys_pn: "upload-progress-layer",
        className: `${ui.fig.family}__layer ${ui.fig.group}__layer upload-progress-layer`,
        sortWithCollection: false,
      }),

      // Live audio/video calls (window_meeting / window_connect) get a layer of
      // their own, for the same reason upload-progress has one: it must survive
      // everything the desk does to the other layers. headlessLayer — where a
      // call used to land, since getWindowsPool() answers it while a workspace
      // pane is open — is re-fed on every workspace switch (wm/index.js
      // loadWorkspace) and cleared when the last pane closes
      // (Desk.onWorkspaceClosed), and BOTH those destroyed the call window and
      // dropped the user out of the meeting. Routing is in
      // manager.js getWindowsPool(kind) / getCallPool().
      Skeletons.Wrapper.Y({
        sys_pn: "call-layer",
        className: `${ui.fig.family}__layer ${ui.fig.group}__layer call-layer`,
        sortWithCollection: false,
      }),

      // Transient "file created" card (bottom-right). Fed by
      // notifyFileCreated (wm/index.js) when a new document / spreadsheet /
      // presentation is created — the file no longer opens by itself.
      Skeletons.Box.Y({
        sys_pn: "file-created-layer",
        className: `${ui.fig.family}__file-created-layer`,
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
