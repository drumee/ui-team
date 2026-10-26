// ===========================================================
//  Casual Docs editor topbar — the shared player topbar widget,
//  configured as the Drumee 2.0 "File viewer" header (Figma
//  1319:146667): Share pill + Download / gear / Move & Resize /
//  Close. The gear rows and the services live in editor/chrome.
// ===========================================================
const Topbar = require("builtins/player/widget/topbar");
const chrome = require("builtins/editor/chrome");

// The identity block (glyph + title) is gone on purpose: Casual's OWN title
// bar renders the document name and the menu row; docs_state lays it out as
// the Figma's two rows (glyph + name, then File / Edit / View …) and this
// Drumee bar floats its action cluster over the right side of that header.
function config(ui) {
  return chrome.topbarConfig(ui, {
    tabs: true,
    status: Skeletons.Note({
      // No floppy button — the document autosaves (state.js onSave,
      // debounced) and Ctrl+S saves at once. The label mirrors the demo's
      // "All changes saved" and is driven by editor.setSaveStatus():
      // saved | saving | unsaved.
      sys_pn: "save-status",
      className: "editor-docs__save-status drumee-topbar__status",
      content: LOCALE.ALL_CHANGES_SAVED || "All changes saved",
      active: 0,
      dataset: { state: "saved" },
    }),
  });
}

module.exports = function (ui) {
  return Topbar(ui, config(ui));
};
