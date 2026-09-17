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
