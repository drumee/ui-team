// ================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /src/drumee/builtins/window/note/skeleton/index.js
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_window_note(_ui_) {
  const editor = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__editor--outer`,
    kids: [
      Skeletons.Entry({
        sys_pn: "editor",
        service: "text-input",
        className: `${_ui_.fig.family}__editor column`,
        type: _a.textarea,
        value: _ui_.content,
        interactive: 1,
        escapeContextmenu: true,
        attribute: {
          id: _ui_.editorId,
        },
      })
    ]
  });

  if (_ui_.el.dataset.column == '1') {
    return [editor]
  }
  const viewer = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__viewer--outer column`,
    sys_pn: "viewer-outer",
    kids: [
      Skeletons.Element({
        sys_pn: "viewer",
        service: _e.raise,
        className: `${_ui_.fig.family}__viewer`,
        state: 1,
        flow: _a.y,
        attribute: {
          id: _ui_.viewerId,
        },
      })
    ]
  })

  return [editor, viewer]
}
module.exports = __skl_window_note;
