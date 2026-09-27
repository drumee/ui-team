// ===========================================================
//  Sheet editor topbar — the SAME shared widget the office
//  (document) player uses, so the header reads identically:
//  file-type glyph + filename on the left, a Save action, a
//  gear menu (Rename / Save / Close) and the window controls
//  on the right. The title is registered as the "player-title"
//  part, which is what renameInline() edits in place.
// ===========================================================
const Topbar = require("builtins/player/widget/topbar");

/** Gear-menu rows. Only services this editor actually answers. */
function gearMenu(ui) {
  return [
    { id: "menu-save", label: LOCALE.SAVE || "Save", icon: "floppy", service: _e.save },
    {
      id: "menu-rename",
      label: LOCALE.RENAME || "Rename",
      icon: "app-edit",
      service: "direct-rename",
    },
    { separator: true },
    // Replaces Casual's own "Help" menu (hidden in the skin): opens Drumee's
    // support conversation, or the support mail link as a fallback.
    {
      id: "menu-contact",
      label: LOCALE.CONTACT_US,
      icon: "apps-chat",
      service: "contact-support",
    },
    { separator: true },
    { id: "menu-close", label: LOCALE.CLOSE || "Close", icon: "cross", service: _e.close },
  ];
}

function config(ui) {
  return {
    left: {
      // Casual Sheets has no title bar of its own (unlike Docs), so this row IS
      // the document title row — styled like the Casual/Google demo: coloured
      // sheet logo + 16px inline-editable name.
      fileTypeIcon: "raw-documents_usheet",
      title: ui.mget(_a.filename),
    },
    right: {
      before: [
        {
          // No floppy: the sheet autosaves (state.js onChange, debounced) and
          // Ctrl+S saves at once; this label mirrors the demo's
          // "All changes saved" — driven by editor.setSaveStatus().
          type: "custom",
          component: Skeletons.Note({
            sys_pn: "save-status",
            className: "editor-sheet__save-status drumee-topbar__status",
            content: LOCALE.ALL_CHANGES_SAVED,
            active: 0,
            dataset: { state: "saved" },
          }),
        },
        {
          // Light/dark switch, the demo's half-disc glyph. Routes to
          // editor.applyTheme() which re-skins this window AND tells Casual
          // (api.setTheme) so the grid follows.
          type: "custom",
          component: Skeletons.Note({
            sys_pn: "ctrl-theme",
            className: "editor-sheet__theme-toggle icon",
            content: "◐",
            service: "toggle-theme",
            uiHandler: [ui],
          }),
        },
      ],
      // Keep the proven window controls (maximize / close) that the base
      // player already answers, instead of the widget's Move & Resize snap
      // panel (which needs per-consumer snap plumbing this editor doesn't have).
      after: [
        {
          type: "custom",
          component: require("window/skeleton/topbar/control")(ui, "sc"),
        },
      ],
    },
    defaults: {
      "folder-settings": { menu: gearMenu(ui) },
      "move-resize": { visible: false },
      close: { visible: false },
    },
  };
}

const __skl_editor_sheet_topbar = function (ui) {
  return Topbar(ui, config(ui));
};

module.exports = __skl_editor_sheet_topbar;
