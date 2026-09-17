// ===========================================================
//  Casual Docs editor topbar — the shared player topbar widget
//  (file glyph + filename + Save + gear + window controls).
// ===========================================================
const Topbar = require("builtins/player/widget/topbar");

function gearMenu(ui) {
  return [
    { id: "menu-save", label: LOCALE.SAVE || "Save", icon: "floppy", service: _e.save },
    // Same row the sheet's gear menu carries. Casual's own title bar has an
    // inline-editable name, but it only appears in co-editing mode and it
    // renames through Casual — this is the Drumee rename (media.rename), and
    // it is the ONLY one in single-user mode.
    {
      id: "menu-rename",
      label: LOCALE.RENAME || "Rename",
      icon: "app-edit",
      service: "direct-rename",
    },
    { separator: true },
    // Replaces Casual's own "Help" menu (hidden by docs_state): opens Drumee's
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

// The identity block (glyph + title) is gone on purpose: Casual's OWN title
// bar renders the logo, the inline-editable document name and the menu row —
// exactly the docs.casualoffice.org header. This Drumee bar shrinks to a
// floating cluster (save status + gear + maximize/close) over its right side.
function config(ui) {
  return {
    right: {
      before: [
        {
          // Google-Docs/Casual-demo style: no floppy button — the document
          // autosaves (state.js onSave, debounced) and Ctrl+S saves at once.
          // This label mirrors the demo's "All changes saved" and is driven
          // by editor.setSaveStatus(): saved | saving | unsaved.
          type: "custom",
          component: Skeletons.Note({
            sys_pn: "save-status",
            className: "editor-docs__save-status drumee-topbar__status",
            content: LOCALE.ALL_CHANGES_SAVED || "All changes saved",
            active: 0,
            dataset: { state: "saved" },
          }),
        },
      ],
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

module.exports = function (ui) {
  return Topbar(ui, config(ui));
};
