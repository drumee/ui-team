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
module.exports = __skl_editor_docs;
