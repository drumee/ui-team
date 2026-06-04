// src/drumee/builtins/window/upload-progress/skeleton/staging.js
// Staging section: Add files / Add folder / drop hint + grouped staging list.
// Visible only in staging phase (ui._phase === "staging").

module.exports = function staging(ui) {
  const pfx = `${ui.fig.family}`;
  return Skeletons.Box.Y({
    className: `${pfx}__staging`,
    sys_pn: "staging",
    dataset: { phase: ui._phase || "staging" },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__staging-actions`,
        kids: [
          // files picker (multiple)
          Skeletons.FileSelector({
            sys_pn: "fileselector",
            bubble: 0, service: "", partHandler: ui, uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}__add-files`, content: LOCALE.ADD_FILES || "Add files",
            service: "add-files", uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}__add-folder`, content: LOCALE.ADD_FOLDER || "Add folder",
            service: "add-folder", uiHandler: [ui],
          }),
        ],
      }),
      // grouped list of staged entries (rendered dynamically by index.js)
      Skeletons.Box.Y({
        className: `${pfx}__staging-list`, sys_pn: "staging-list", kids: [],
      }),
      // Bulk conflict policy chosen UP-FRONT (frontend-only, no name enumeration needed):
      // toggle OFF (default) = keep both (server appends timestamp); ON = replace existing.
      Skeletons.Button.Label({
        className: `${pfx}__replace-toggle`, ico: "refresh-view",
        label: LOCALE.REPLACE_EXISTING || "Replace existing files",
        state: 0,
        service: "toggle-replace", uiHandler: [ui],
      }),
      Skeletons.Box.X({
        className: `${pfx}__staging-footer`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__staging-summary`, sys_pn: "staging-summary",
            content: "",
          }),
          Skeletons.Note({
            className: `${pfx}__upload-all`, content: LOCALE.UPLOAD_ALL || "Upload all",
            service: "upload-all", uiHandler: [ui],
          }),
          Skeletons.Note({
            className: `${pfx}__clear-bundle`, content: LOCALE.CLEAR || "Clear",
            service: "clear-bundle", uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
};
