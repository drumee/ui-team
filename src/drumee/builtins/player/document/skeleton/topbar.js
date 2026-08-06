// ==================================================================== *
//   Copyright Xialia.com  2011-2026
//   FILE : builtins/player/document/skeleton/topbar
//   TYPE : Skeleton
// ==================================================================== *

/**
 * Document-player header — the shared topbar widget, configured.
 *
 * Two of the widget's three defaults are switched off:
 *
 *   folder-settings — the document player has no gear catalog
 *                     (`contextmenuItems` is just `[_a.link]`).
 *   move-resize     — its presets emit the folder window's snap vocabulary
 *                     (`window-zoom`, `window-tile-*`, `window-reframe`),
 *                     none of which this player handles. It has its own
 *                     `doc-zoom` toggle in the action list instead.
 *
 * Close stays, re-pointed at `_e.close`, which is the service this player's
 * `onUiEvent` actually listens for.
 *
 * No file-type tile: the document header never had one, and adding it here
 * would be a visual change nobody asked for. Pass `left.fileTypeIcon` to
 * turn it on.
 */

const Topbar = require("builtins/player/widget/topbar");
const actions = require("./actions");

/**
 * One source of truth, handed to both the full header and the action-row
 * rebuild `updateMenu()` performs.
 */
function config(ui) {
  return {
    left: {
      title: ui.model.get(_a.filename),
    },
    right: {
      before: actions(ui),
    },
    defaults: {
      "folder-settings": { visible: false },
      "move-resize": { visible: false },
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
