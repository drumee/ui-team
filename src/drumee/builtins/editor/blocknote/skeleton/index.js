// ===========================================================
//  Notion-style Note (BlockNote) window — header + the body
//  the editor mounts into.
// ===========================================================

/**
 * Deliberately NOT `window/skeleton/content/main`, which the other editors
 * reuse: that helper fills the body with `gridFilesBrowser(ui)`, the folder
 * file-browser. An editor has no files to browse, so those kids render as a
 * `core-failover` block that sits above the editor and eats half the window.
 *
 * Everything else that helper provides — the tooltips and modal-dialog
 * wrappers the window chrome expects — is kept, so context menus and dialogs
 * behave exactly as they do in any other window.
 */
function __skl_editor_blocknote(_ui_) {
  const pfx = _ui_.fig.family;
  const group = _ui_.fig.group;

  const header = Skeletons.Box.X({
    debug: __filename,
    className: `${pfx}__header ${group}__header`,
    sys_pn: "window-header",
    service: _e.raise,
    kidsOpt: {
      radio: _a.on,
      uiHandler: _ui_,
    },
    kids: [require("./topbar")(_ui_)],
  });

  const body = Skeletons.Box.Y({
    className: `${pfx}__body ${group}__body`,
    sys_pn: _a.content,
  });

  const tooltips = Skeletons.Wrapper.Y({
    className: `${group}__wrapper-container`,
    name: "tooltips",
  });

  const dialog = Skeletons.Wrapper.Y({
    className: `${group}__wrapper--modal dialog__wrapper--modal ${pfx}`,
    name: "dialog",
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}__main ${group}__main`,
    radio: _a.parent,
    kids: [header, tooltips, body, dialog],
  });
}
module.exports = __skl_editor_blocknote;
