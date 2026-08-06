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

// The tile glyph follows the file, not the player. Office extensions are
// grouped by document kind; the two formats that are neither get their own
// glyph, and anything unrecognised falls back to the document one.
//
// Extensions are the editable set (../editable.js) plus the read-only
// formats this viewer also opens.
const SPREADSHEET = [
  "xls", "xlsx", "xlsm", "xltx", "xltm", "xlsb", "ods", "ots", "csv",
];
const PRESENTATION = [
  "ppt", "pptx", "pptm", "potx", "potm", "ppsx", "ppsm", "odp", "otp",
];
const TILE_ICON = {
  pdf: "app-pdf-file",
  html: "app-html-file",
  htm: "app-html-file",
};

function tileIcon(ext) {
  if (TILE_ICON[ext]) return TILE_ICON[ext];
  if (SPREADSHEET.includes(ext)) return "app-xls-file";
  if (PRESENTATION.includes(ext)) return "app-ppt-file";
  return "app-doc-file";
}

/**
 * One source of truth, handed to both the full header and the action-row
 * rebuild `updateMenu()` performs.
 */
function config(ui) {
  const ext = (ui.mget(_a.ext) || "").toLowerCase();
  return {
    left: {
      fileTypeIcon: tileIcon(ext),
      title: ui.model.get(_a.filename),
    },
    right: {
      before: actions(ui),
    },
    defaults: {
      "folder-settings": { menu: actions.menu(ui) },
      // All four presets. "center" restores to `_defaultBounds()`, which is
      // the pre-zoom geometry when there is one and the current box
      // otherwise. The window opens at max_size (maximized outright in edit
      // mode), so "full" is the preset lit before the user picks.
      "move-resize": { active: "full" },
      // Only the service is overridden. The widget's own `icon close` class
      // is what the skin sizes and colours; `window-button__icon-button` has
      // no global styling of its own — every rule for it in the tree is
      // scoped to some other container.
      close: { service: _e.close },
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
