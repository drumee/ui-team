/** ================================================================== *
#   FILE : /src/drumee/builtins/editor/chrome
#   TYPE : helper — the Drumee 2.0 "File viewer" window chrome shared by
#          the Casual Docs and Casual Sheets editors
# ===================================================================**/

/**
 * Figma "Drumee 2.0" ↪ File viewer (1319:50973): the editor card's header
 * ends with a Share pill and four 48px actions — Download, gear menu,
 * Move & Resize, Close — and the gear menu reads Make a copy / Rename /
 * Chat threads ▸ / Share / Get info / Move to trash, exactly the file
 * actions the document player offers.
 *
 * Both editors extend player/interact, which knows nothing about those
 * file actions: this module turns them into the topbar widget's config and
 * answers the services. Rows that act on the NODE (copy, trash, chat
 * threads) are forwarded to the source MFS view — the grid tile the file was
 * opened from, or the tile the first save created — which implements the
 * whole vocabulary already (same pattern as player/document `_delegate`).
 */
const snap = require("builtins/window/snap");
const details = require("builtins/player/widget/details");
const share = require("builtins/player/widget/share");

const DELEGATED = [_a.duplicate, _e.copy, _e.remove, _a.chat, "chat-threads", "download-file-chat"];
const PRESETS = ["full", "left", "right", "center"];

/** The gear menu rows (Figma 1364:120251). `opt.tabs` adds Document tabs. */
function gearMenu(ui, opt = {}) {
  const rows = [
    { id: "menu-copy", label: LOCALE.MAKE_A_COPY, icon: "apps-copy", service: _a.duplicate },
    { id: "menu-rename", label: LOCALE.RENAME, icon: "file-rename", service: "direct-rename" },
  ];
  if (opt.tabs) {
    // Google-Docs "Document tabs" (docs/skeleton/tabs-rail) — not in the
    // Figma, kept because the rail is only reachable from here.
    rows.push({
      id: "menu-tabs",
      label: LOCALE.DOCUMENT_TABS || "Document tabs",
      icon: "app-doc-file",
      service: "toggle-doc-tabs",
    });
  }
  rows.push({
    id: "menu-chat-threads",
    label: LOCALE.CHAT_THREADS,
    icon: "ctxmenu-chat-thread",
    service: "chat-threads",
    children: [
      { id: "menu-view-chat-threads", label: LOCALE.VIEW_CHAT_THREADS, service: _a.chat },
      {
        id: "menu-download-chat-threads",
        label: LOCALE.DOWNLOAD_CHAT_THREADS,
        service: "download-file-chat",
      },
    ],
  });
  rows.push({ separator: true });
  rows.push({ id: "menu-share", label: LOCALE.SHARE, icon: "noti-share-network", service: "secure-share" });
  rows.push({ id: "menu-info", label: LOCALE.GET_INFO, icon: "ctxmenu-info", service: "info" });
  rows.push({ separator: true });
  rows.push({
    id: "menu-trash",
    label: LOCALE.MOVE_TO_TRASH,
    icon: "ph-trash",
    service: _e.remove,
    className: "trash",
  });
  return rows;
}

/**
 * The shared topbar widget's config for an editor window.
 *
 * @param {object} ui
 * @param {object} opt   { left, status, tabs }
 *   left    the widget's identity block (sheet: glyph + title; docs: none,
 *           Casual's own title bar carries them)
 *   status  the "All changes saved" Note, placed first in the cluster
 */
function topbarConfig(ui, opt = {}) {
  const before = [];
  if (opt.status) before.push({ type: "custom", component: opt.status });
  before.push({
    id: "ctrl-share",
    label: LOCALE.SHARE,
    icon: "app-lock",
    service: "secure-share",
    className: "editor-chrome__share",
  });
  before.push({
    id: "ctrl-download",
    icon: "dl-download-simple",
    service: _e.download,
    className: "icon editor-chrome__btn",
  });
  return {
    left: opt.left,
    right: { before, after: [] },
    defaults: {
      "folder-settings": {
        menu: gearMenu(ui, opt),
        icon: "apps-gear",
        className: "icon gear editor-chrome__btn",
      },
      "move-resize": { icon: "meet-expand" },
      close: { icon: "cross", className: "icon close editor-chrome__btn", service: _e.close },
    },
  };
}

/** The MFS view that stands for the open file, when there is one. */
function nodeOf(ui) {
  for (const m of [ui.media, ui._chromeNode]) {
    if (m && !m.isDestroyed() && _.isFunction(m.onUiEvent)) return m;
  }
  return null;
}

/**
 * A new file has no source tile until its first save creates one; the
 * editor's save hands that tile here so the gear menu works from then on.
 */
function adoptNode(ui, file) {
  if (ui.media || !file || file.isDestroyed()) return;
  ui._chromeNode = file;
}

function snapOpt() {
  return { minWidth: 480, minHeight: 320 };
}

/** Light up the preset the window now sits in (Move & Resize panel). */
function markPreset(ui, preset) {
  if (!ui.el) return;
  for (const el of ui.el.querySelectorAll(".drumee-topbar__snap-preset[data-preset]")) {
    el.dataset.active = el.dataset.preset === preset ? 1 : 0;
  }
}

function download(ui) {
  if (_.isFunction(ui._dmzGateDownload) && ui._dmzGateDownload()) return true;
  const node = nodeOf(ui);
  if (!node) {
    // Nothing on disk yet: the first autosave is seconds away.
    if (_.isFunction(ui.saveContent)) ui.saveContent();
    return true;
  }
  const { isCasualFile, downloadAsOffice } = require("builtins/editor/export");
  // A real .docx / .xlsx rather than the JSON payload (editor/export).
  const raw = () => (_.isFunction(node.download) ? node.download() : null);
  if (isCasualFile(node)) {
    downloadAsOffice(node).catch((e) => {
      ui.warn("editor chrome: office export failed, raw download", e);
      raw();
    });
  } else {
    raw();
  }
  return true;
}

/**
 * Answer a chrome service. Returns false for anything that is not this
 * module's, so the editor falls through to its own switch / the base.
 *
 * @param {object} ui    the editor window
 * @param {object} cmd   the clicked view
 * @param {object} args
 */
function handleService(ui, cmd, args = {}) {
  const service = args.service || (cmd && _.isFunction(cmd.get) && cmd.get(_a.service));
  switch (service) {
    // Move & Resize presets — same snap module and vocabulary as the folder
    // window and the document player, one code path for every window.
    case "window-zoom":
      snap.toggleZoom(ui, snapOpt());
      markPreset(ui, ui._zoomed ? "full" : "center");
      return true;
    case "window-tile-left":
      snap.tileToSide(ui, "left", snapOpt());
      markPreset(ui, "left");
      return true;
    case "window-tile-right":
      snap.tileToSide(ui, "right", snapOpt());
      markPreset(ui, "right");
      return true;
    case "window-reframe":
      snap.reframe(ui, ui._preZoomBounds || snap.snapshotBounds(ui), snapOpt());
      markPreset(ui, "center");
      return true;

    // Share opens the secure-share panel as a floating window (widget/share
    // launch, from this window's own attributes). A window opened from a
    // tile only adopted nid / hub_id / pid: the rest of the node (filetype,
    // area, ext, name) is copied in first so the panel knows the file.
    case "secure-share": {
      const node = nodeOf(ui);
      if (node) {
        const fill = {};
        for (const k of [_a.filetype, _a.area, _a.ext, _a.filename, _a.nid, _a.hub_id]) {
          if (ui.mget(k) == null && node.mget(k) != null) fill[k] = node.mget(k);
        }
        if (Object.keys(fill).length) ui.mset(fill);
      }
      share.click(ui, cmd);
      return true;
    }

    // The base player's _showInfo() needs a `wrapper-info` part the editor
    // skeletons do not have; the document player's details card instead.
    case "info":
      details.open(ui);
      return true;

    case _e.download:
    case _a.download:
      return download(ui);

    default:
      if (!DELEGATED.includes(service)) return false;
      {
        const node = nodeOf(ui);
        if (node) node.onUiEvent(cmd, args);
        else ui.warn(`editor chrome: no source node for ${service} yet`);
      }
      return true;
  }
}

module.exports = { gearMenu, topbarConfig, handleService, adoptNode, nodeOf, PRESETS };
