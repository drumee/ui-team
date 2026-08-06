// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/document/skeleton/actions
//   TYPE : Skeleton
// ==================================================================== *

/**
 * The document player's topbar actions, as data for the shared topbar
 * widget (builtins/player/widget/topbar).
 *
 * These are rendered inline in the header rather than behind a dropdown
 * trigger, so they stay directly discoverable — the widget's `before`
 * slot places them ahead of its own defaults.
 *
 * Every conditional here is the one the previous skeleton applied; only
 * the return type changed, from skeletons to TopbarAction descriptors.
 */

const EDITABLE = require("../editable");

const cnWindowButton = "window-button";

// Download / save-as-PDF / preview / print get the filled (primary) look;
// every other action is a plain icon button.
const PRIMARY_SERVICES = ["download-pdf", "preview", "print", _a.edit];

function tooltip(ui, content) {
  return {
    className: `${ui.fig.family}__tooltips ${ui.fig.name}-tooltips ${cnWindowButton}__tooltips`,
    content,
  };
}

// Can THIS VIEWER really edit the office doc, i.e. will the editor open writable?
// ui.canUpload() alone cannot answer it: that reads the node privilege, which
// dmz/wm getWindowPreset pins to the LINK's cap — so a can_edit link looks writable
// even to an anonymous opener, whom the editor then forces read-only. They ended up
// in a read-only editor with no Request-edit action at all. The sharebox publishes
// the viewer-aware answer on loadDeskContent (is_authenticated AND can_edit, which
// mirrors the editor's own rule). If that flag is absent — boot race, or any
// non-share session — fall back to the previous canUpload() test so behaviour is
// unchanged rather than guessed.
function _dmzViewerCanEdit(ui) {
  const r = typeof window !== "undefined" && window.uiRouter;
  const flag = r && r._dmzShareViewerCanEdit;
  if (typeof flag === "boolean") return flag;
  return !!(ui && typeof ui.canUpload === "function" && ui.canUpload());
}

/**
 * One TopbarAction. `id` is only set where the old skeleton set `sys_pn`:
 * the widget maps `id` onto `sys_pn`, and every named part registers itself
 * on the player as `__camelCase`, so naming everything would quietly add
 * properties to a 1200-line class for no gain.
 */
function action(ui, { service, ico, tip, state, icons, sys_pn }) {
  const a = {
    type: "button",
    icon: ico,
    className: `${cnWindowButton}__icon-button`,
    service,
    tooltips: tooltip(ui, tip),
    style: PRIMARY_SERVICES.includes(service)
      ? {
          "background-color": "var(--normal-bg-90)",
          color: "var(--normal-fg-10)",
          padding: "4px 8px",
          "border-radius": "6px",
        }
      : { color: "var(--normal-fg-20)" },
  };
  if (state != null) a.state = state;
  if (icons) a.icons = icons;
  if (sys_pn) {
    a.id = sys_pn;
    a.partHandler = ui;
  }
  return a;
}

module.exports = function (ui) {
  const actions = [];

  // Download-as-PDF, Edit and Print are NOT inline any more. In preview mode
  // they were in the header AND in the gear menu, which is where they now
  // live alone (see `.menu` below). In edit mode they were already hidden —
  // they surface the stale server info.pdf, which the server never re-runs —
  // so dropping them here costs nothing there.
  //
  // Header download icon was already intentionally hidden for docs (product
  // request). DMZ download gating still lives on those handlers via
  // _dmzGateDownload().

  // The one action with no gear-menu equivalent: a secure-share recipient the
  // editor will force READ-ONLY gets a "Request edit" that opens the share's
  // request-access popup (reusing the already-wired dmz-request-download gate
  // → sharebox → Request Access / sign-up).
  if (
    Visitor.inDmz &&
    !_dmzViewerCanEdit(ui) &&
    Platform.get("doc_editor") &&
    EDITABLE.includes((ui.mget(_a.ext) || "").toLowerCase())
  ) {
    actions.push(
      action(ui, {
        service: "dmz-request-edit",
        ico: "app-edit",
        tip: LOCALE.SECURE_SHARE_REQUEST_ACCESS || LOCALE.EDIT,
      }),
    );
  }

  // Maximize used to be an inline `doc-zoom` button here. It is now the
  // "full" preset in the widget's Move & Resize panel, which also offers
  // tiling — two controls that both maximised, differently, was worse than
  // one. `toggleZoom()` and `case "doc-zoom"` are left in place; nothing in
  // the header reaches them any more.

  // True full screen → browser Fullscreen API on the whole viewer (fills the
  // monitor). Distinct from the Move & Resize presets, which only ever fill
  // the workspace.
  actions.push(
    action(ui, {
      service: "doc-fullscreen",
      ico: ui._fullscreen ? "desktop_reduce" : "player-fullscreen",
      tip: ui._fullscreen ? LOCALE.EXIT_FULLSCREEN : LOCALE.FULLSCREEN,
      sys_pn: "doc-fullscreen-btn",
    }),
  );

  return actions;
};

/**
 * The gear menu, as MenuItem data for the widget's folder-settings default.
 *
 * Every row maps to a service this player already answers — the four in its
 * own `onUiEvent` plus "info", which the base class handles
 * (player/interact.js). `_a.link` is deliberately absent: its case is a bare
 * `break`, so a "Copy link" row would look live and do nothing.
 *
 * Download-as-PDF / Print / Edit repeat the inline buttons. That is
 * intentional — a menu that omits the primary actions reads as if they are
 * unavailable — but see the header comment if the inline row should shrink.
 */
module.exports.menu = function (ui) {
  const isEditing = ui.mget(_a.mode) == _a.edit;
  const ext = (ui.mget(_a.ext) || "").toLowerCase();
  const sections = [];

  const file = [];
  if (ext != _a.pdf && !isEditing) {
    file.push({
      id: "download-pdf",
      label: LOCALE.DOWNLOAD_AS_PDF,
      icon: "app-pdf-file",
      service: "download-pdf",
    });
  }
  if (!isEditing) {
    file.push({ id: "print", label: LOCALE.PRINT, icon: "app-print", service: "print" });
  }
  if (file.length) sections.push(file);

  // Edit and Preview are the two directions of the same toggle, so only one
  // of them is ever offered.
  const mode = [];
  if (!Visitor.inDmz && Platform.get("doc_editor") && EDITABLE.includes(ext)) {
    if (isEditing) {
      mode.push({ id: "preview", label: LOCALE.PREVIEW, icon: "app-file", service: _a.preview });
    } else {
      mode.push({
        id: "edit",
        label: ui.canUpload() ? LOCALE.EDIT : LOCALE.OPEN,
        icon: "app-edit",
        service: _a.edit,
      });
    }
  }
  if (mode.length) sections.push(mode);

  // Handled by the base player, not this class.
  sections.push([
    { id: "info", label: LOCALE.GET_INFO, icon: "ctxmenu-info", service: "info" },
  ]);

  const items = [];
  sections.forEach((s, i) => {
    if (i) items.push({ separator: true });
    items.push(...s);
  });
  return items;
};
