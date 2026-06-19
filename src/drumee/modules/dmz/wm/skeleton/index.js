// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/dmz/wm/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

const { button } = require("../../../../builtins/skeleton/toolkit/buttons");

const FILTER_TABS = [
  { label: LOCALE.ALL || "All", value: "all" },
  { label: LOCALE.DOCS || "Docs", value: "docs" },
  { label: LOCALE.PDF || "PDF", value: "pdf" },
  { label: LOCALE.IMAGES || "Images", value: "image" },
  { label: LOCALE.OTHER, value: "other" },
];

function _filter_bar(_ui_) {
  const cnFilter = "window-filter";
  return Skeletons.Box.X({
    className: `${cnFilter}__bar ${_ui_.fig.family}__filter-bar`,
    flow: _a.x,
    kids: FILTER_TABS.map((tab, index) =>
      button(_ui_, {
        label: tab.label,
        className: `${cnFilter}__tab ${_ui_.fig.family}__filter-tab`,
        service: "filter-by-type",
        state: index === 0 ? 1 : 0,
        radiotoggle: `media-filter-${_ui_.cid}`,
        value: tab.value,
      }),
    ),
  });
}

function _icons_list(_ui_) {
  return Skeletons.List.Smart({
    className: `${_ui_.fig.family}__icons-list icons-list desk-content`,
    innerClass: `${_ui_.fig.family}__icons-scroll`,
    sys_pn: _a.list,
    flow: _a.y,
    bubble: 1,
    timer: 1000,
    vendorOpt: Preset.List.Orange_e,
    itemsOpt: {
      kind: "media",
      role: "dmz",
      token: _ui_.mget(_a.token),
      // Pin the share's (capped) privilege onto every tile. The guest session is
      // cookie-bound to the share creator, so the server lists each node with the
      // creator's FULL privilege — without this a view-only recipient could drop a
      // file onto a sub-folder tile (its privilege carries the write bit) and upload.
      // itemsOpt is spread AFTER the row in list/smart, so this overrides the row
      // value. Mirrors getWindowPreset/fetchMediaAttributes capping. Guarded so
      // flows that don't advertise a privilege (e.g. meeting) keep the row value —
      // the secure share always sets one (default 3 = view-only).
      ...(_ui_.mget(_a.privilege) ? { privilege: ~~_ui_.mget(_a.privilege) } : {}),
      signal: _e.ui.event,
      service: "open-node",
      uiHandler: [_ui_],
      on_start: "open-node",
    },
    api: _ui_.mget(_a.api),
  });
}

// ======================================================
// Desk content _ui_
// ======================================================

function _desk_content(_ui_) {
  return Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main`,
    sys_pn: "window-wrapper",
    debug: __filename,
    styleOpt: {
      height: _K.size.full,
    },
    kids: [
      _filter_bar(_ui_),
      _icons_list(_ui_),
      { kind: "selection", sys_pn: "ref-selection" },

      Skeletons.FileSelector({
        partHandler: _ui_,
      }),

      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__windows-layer`,
        sys_pn: "windows-layer",
      }),

      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__wrapper`,
        name: "tooltips",
      }),

      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__wrapper-modal`,
        name: "modal",
      }),
    ],
  });
}

export default _desk_content;
