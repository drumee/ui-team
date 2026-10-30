const withFileSwitcher = require("builtins/player/widget/file-switcher/frame");
// ===========================================================
//  Casual Docs editor window — header + body the DocxEditor
//  mounts into (mirrors the sheet editor skeleton).
// ===========================================================
function loadingSkeleton() {
  const pfx = "editor-loading";
  const bones = (cls, n) =>
    Array.from({ length: n }, () => Skeletons.Box.X({ className: `${pfx}__bone ${cls}`, active: 0 }));
  return Skeletons.Box.Y({
    className: `${pfx} ${pfx}--skel ${pfx}--docs`,
    dataset: { state: 1 },
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__titlebar`,
        kids: [
          ...bones(`${pfx}__bone--glyph`, 1),
          Skeletons.Box.Y({
            className: `${pfx}__titlecol`,
            kids: [
              ...bones(`${pfx}__bone--name`, 1),
              Skeletons.Box.X({ className: `${pfx}__menu`, kids: bones(`${pfx}__bone--menu`, 7) }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({ className: `${pfx}__toolbar`, kids: bones(`${pfx}__bone--tool`, 14) }),
      Skeletons.Box.Y({
        className: `${pfx}__canvas`,
        kids: [
          Skeletons.Box.X({ className: `${pfx}__ruler` }),
          Skeletons.Box.Y({
            className: `${pfx}__page`,
            kids: bones(`${pfx}__bone--line`, 9),
          }),
          Skeletons.Box.X({
            className: `${pfx}__card`,
            kids: [
              Skeletons.Box.X({ className: `${pfx}__spinner`, active: 0 }),
              Skeletons.Note({
                content: LOCALE.LOADING,
                active: 0,
                className: `${pfx}__text`,
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

function __skl_editor_docs(_ui_) {
  const header = require("./topbar")(_ui_);

  const body = Skeletons.Box.Y({
    className: `${_ui_.fig.family}__body ${_ui_.fig.group}__body`,
    sys_pn: _a.content,
    partHandler: _ui_,
    // Shown while the docs_state chunk (Casual Docs + WASM engine) downloads
    // and mounts. A skeleton of the document itself — title bar, toolbar
    // pill, the page on its canvas — with a centred "Loading…" card. It
    // covers the editor until a page has painted (docs_state, through
    // editor/loading-reveal).
    kids: [loadingSkeleton()],
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

  // In the Open-File Switcher frame, like every other viewer opened from a
  // folder (the panel lists this file's neighbours).
  return withFileSwitcher(_ui_, Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main ${_ui_.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [header, row, dialog],
  }));
}
module.exports = __skl_editor_docs;
