// ===========================================================
//  Sheet editor window — header + empty body the sheet mounts
//  into. Same shell shape as window/skeleton/content/main but
//  without the files-browser grid (an editor has no file list,
//  and the grid's List.Smart requires a getCurrentApi()).
// ===========================================================
function __skl_editor_sheet(_ui_) {
  // The shared player topbar widget IS the header (file glyph + title + gear
  // menu + window controls) — fed as a direct kid, exactly like the office
  // (document) player composes it.
  const header = require("./topbar")(_ui_);

  const body = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__body ${_ui_.fig.group}__body`,
    sys_pn: _a.content,
    partHandler: _ui_,
    // Shown while the sheet_state chunk (Univer + Casual, several MB on a
    // cold cache) downloads and mounts; sheet_state._reactHost removes it.
    // Same shape as the office player's progress part (player/document
    // skeleton buildProgress): an indeterminate bar under the header and a
    // centred label — so a Casual sheet loads the way an .xlsx does.
    kids: [
      Skeletons.Box.X({
        className: "editor-loading",
        dataset: { state: 1, loading: "indeterminate" },
        kidsOpt: { active: 0 },
        kids: [
          Skeletons.Box.X({ className: "editor-loading__bar", active: 0 }),
          Skeletons.Note({
            content: LOCALE.LOADING,
            active: 0,
            className: "editor-loading__text",
          }),
        ],
      }),
    ],
  });

  const dialog = Skeletons.Wrapper.Y({
    className: `${_ui_.fig.group}__wrapper--modal dialog__wrapper--modal ${_ui_.fig.family}`,
    name: "dialog",
  });

  return Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main ${_ui_.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [header, body, dialog],
  });
}
module.exports = __skl_editor_sheet;
