// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/document/skeleton/topbar
//   TYPE : Skeleton
// ==================================================================== *

/**
 * Document-player header — the shared topbar widget, configured.
 *
 * All three defaults are on. Close is re-pointed at `_e.close`, which is
 * the service this player's `onUiEvent` actually listens for; the other two
 * use the widget's own vocabulary, which `document/index.js` now answers
 * (the four `window-*` snap services).
 */

const Topbar = require("builtins/player/widget/topbar");
const actions = require("./actions");

// The tile glyph follows the file, not the player.
const TILE_ICON = {
  pdf: "app-pdf-file",
  html: "app-html-file",
  htm: "app-html-file",
};

/**
 * One source of truth, handed to both the full header and the action-row
 * rebuild `updateMenu()` performs.
 */
function config(ui) {
  const ext = (ui.mget(_a.ext) || "").toLowerCase();
  return {
    left: {
      fileTypeIcon: TILE_ICON[ext] || "app-doc-file",
      title: ui.model.get(_a.filename),
    },
    right: {
      before: actions(ui),
    },
    defaults: {
      "folder-settings": { menu: actions.menu(ui) },
      // "center" restores to a windowed default this player does not really
      // have — it opens at max_size (and maximized outright in edit mode),
      // so it starts in "full" and that is the preset lit on open.
      "move-resize": {
        presets: ["full", "left", "right"],
        active: "full",
      },
      close: {
        service: _e.close,
        className: "window-button__icon-button",
      },
    },
  };
}

const __document_topbar = function (ui) {
  return Topbar(ui, config(ui));
};

// Used by `updateMenu()` to re-feed the `commands` part when the mode or
// zoom state changes, without rebuilding the header.
__document_topbar.actions = function (ui) {
  return Topbar.actions(ui, config(ui));
};

module.exports = __document_topbar;
