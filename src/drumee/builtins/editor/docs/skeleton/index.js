// ===========================================================
//  Casual Docs editor window — header + body the DocxEditor
//  mounts into (mirrors the sheet editor skeleton).
// ===========================================================
function __skl_editor_docs(_ui_) {
  const header = require("./topbar")(_ui_);

  const body = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__body ${_ui_.fig.group}__body`,
    sys_pn: _a.content,
    partHandler: _ui_,
    // Shown while the docs_state chunk (Casual Docs + WASM engine) downloads
    // and mounts; docs_state._reactHost removes it. Same shape as the office
    // player's progress part (indeterminate bar + centred label).
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

  // Document tabs live in their own column left of the editor. The part is
  // always present and empty; docs/index.js fills it (skeleton/tabs-rail) and
  // the skin collapses the column while `data-tabs` is not "open".
  const tabs = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__tabs-slot`,
    sys_pn: "doc-tabs",
    partHandler: _ui_,
  });

  const row = Skeletons.Box.X({
    className: `${_ui_.fig.family}__row`,
    kids: [tabs, body],
  });

  return Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main ${_ui_.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [header, row, dialog],
  });
}
module.exports = __skl_editor_docs;
