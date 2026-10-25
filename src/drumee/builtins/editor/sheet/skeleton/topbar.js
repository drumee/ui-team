// ===========================================================
//  Sheet editor topbar — the SAME shared widget the office
//  (document) player uses, configured as the Drumee 2.0 "File
//  viewer" header (Figma 1337:16842): sheet glyph + title on
//  the left (Casual's menu row sits right under them), then a
//  Share pill and Download / gear / Move & Resize / Close. The
//  title is registered as the "player-title" part, which is
//  what renameInline() edits in place. Gear rows + services:
//  editor/chrome.
// ===========================================================
const Topbar = require("builtins/player/widget/topbar");
const chrome = require("builtins/editor/chrome");

function config(ui) {
  return chrome.topbarConfig(ui, {
    left: {
      // Casual Sheets has no title bar of its own (unlike Docs), so this row
      // IS the document title row: the Figma's 36px sheet glyph + 18px
      // inline-editable name.
      fileTypeIcon: "raw-documents_usheet",
      title: ui.mget(_a.filename),
    },
    status: Skeletons.Note({
      // No floppy: the sheet autosaves (state.js onChange, debounced) and
      // Ctrl+S saves at once; this label mirrors the demo's "All changes
      // saved" — driven by editor.setSaveStatus().
      sys_pn: "save-status",
      className: "editor-sheet__save-status drumee-topbar__status",
      content: LOCALE.ALL_CHANGES_SAVED,
      active: 0,
      dataset: { state: "saved" },
    }),
  });
}

const __skl_editor_sheet_topbar = function (ui) {
  return Topbar(ui, config(ui));
};

module.exports = __skl_editor_sheet_topbar;
