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
  { label: LOCALE.MEDIA || "Media", value: "image" },
  { label: LOCALE.OTHER, value: "other" },
];

// The secure-share recipient grid (sharebox desk-content) gets the desk folder
// window's toolbar: a pill track holding the five filters, then the share's own
// "+ Add new" / Upload / Download and the group | list | grid toggle on the same
// row (toolkit fileFilterControls, minus the hub-wide search a recipient must not
// reach). Any other DMZ use of this window manager keeps the plain bar below.
function _toolbar(_ui_, sharebox) {
  const fam = _ui_.fig.family;
  const { fileViewToggle } = require("../../../../builtins/window/skeleton/toolkit/index");
  const { dmzFileActions } = require("../../sharebox/skeleton/desk-content");
  const current = _ui_._filterType || "all";
  return Skeletons.Box.X({
    className: `${fam}__filter-bar ${fam}__toolbar`,
    kids: [
      Skeletons.Box.X({
        className: `${fam}__filter-track`,
        kids: FILTER_TABS.map((tab) =>
          button(_ui_, {
            label: tab.label,
            className: `${fam}__filter-tab`,
            service: "filter-by-type",
            state: tab.value === current ? 1 : 0,
            radiotoggle: `media-filter-${_ui_.cid}`,
            value: tab.value,
          }),
        ),
      }),
      Skeletons.Box.X({
        className: `${fam}-topbar__file-controls`,
        kids: [
          dmzFileActions(sharebox),
          fileViewToggle(_ui_, {
            namedState: true,
            modes: [
              { mode: "group", ico: "app-tree-view" },
              { mode: "list", ico: "view-list" },
              { mode: "grid", ico: "view-grid" },
            ],
          }),
        ],
      }),
    ],
  });
}

function _filter_bar(_ui_) {
  const sharebox = _ui_.shareboxDesk && _ui_.shareboxDesk();
  if (sharebox) return _toolbar(_ui_, sharebox);
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

/**
 * What the list header part holds for a view mode: the desk folder window's
 * column header (window/skeleton/content/row) in list mode, with the desk's
 * class root so its styles apply; nothing otherwise. Fed again by dmz/wm
 * _toggleFilesLayout — a Box sets its display inline, so CSS cannot hide it.
 */
export function listHeaderKids(_ui_, mode) {
  if (mode !== _a.row) return [];
  const { listHeader } = require("../../../../builtins/window/skeleton/content/row");
  return [listHeader(_ui_, { group: "window", selectAll: false, uiHandler: [_ui_] })];
}

// List view's column header part. Secure-share recipient view only, the one
// with the group | list | grid toggle.
function _list_header(_ui_) {
  if (!(_ui_.shareboxDesk && _ui_.shareboxDesk())) return null;
  const mode = (_ui_.getViewMode && _ui_.getViewMode()) || _a.icon;
  return Skeletons.Box.Y({
    className: `${_ui_.fig.family}__list-header`,
    sys_pn: "list-header",
    dataset: { viewMode: mode },
    kids: listHeaderKids(_ui_, mode),
  });
}

function _icons_list(_ui_) {
  return Skeletons.List.Smart({
    className: `${_ui_.fig.family}__icons-list icons-list desk-content`,
    innerClass: `${_ui_.fig.family}__icons-scroll`,
    sys_pn: _a.list,
    flow: _a.y,
    bubble: 1,
    // NO `timer:` HERE, DELIBERATELY — same reason as the file surfaces in
    // window/skeleton (see the note at gridFilesBrowser). `timer: N` arms
    // ui-core's tick() loop (letc/widgets/list/index.js:194), which re-arms
    // itself from renderData() after every page and only stops at
    // `_end_of_data`, so the list silently walks the ENTIRE listing while the
    // tab sits idle.
    //
    // It was dormant on small accounts, which is why it survived the first
    // pass: desk.home answers short on page 1 for anyone with fewer than 45
    // root-level home items, the list calls _eod() and the loop stops. An
    // account that fills a page did not get that reprieve — it walked
    // desk.home once per SECOND, and desk.home measured 442ms avg / 1,967ms
    // max on production.
    //
    // Paging is unaffected: _onScroll (list/index.js:517) is bound for every
    // List.Smart independently of `timer` and fetches the next page on
    // reaching the bottom, with useMouseWheel() covering the not-yet-
    // scrollable case.
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
      _list_header(_ui_),
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
    ].filter(Boolean),
  });
}

export default _desk_content;
