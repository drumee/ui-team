const withFileSwitcher = require("builtins/player/widget/file-switcher/frame");
// ===========================================================
//  Sheet editor window — header + empty body the sheet mounts
//  into. Same shell shape as window/skeleton/content/main but
//  without the files-browser grid (an editor has no file list,
//  and the grid's List.Smart requires a getCurrentApi()).
// ===========================================================
function loadingSkeleton() {
  const pfx = "editor-loading";
  const bones = (cls, n) =>
    Array.from({ length: n }, () => Skeletons.Box.X({ className: `${pfx}__bone ${cls}`, active: 0 }));
  return Skeletons.Box.Y({
    className: `${pfx} ${pfx}--sheet`,
    dataset: { state: 1 },
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Box.X({ className: `${pfx}__menu`, kids: bones(`${pfx}__bone--menu`, 6) }),
      Skeletons.Box.X({ className: `${pfx}__toolbar`, kids: bones(`${pfx}__bone--tool`, 10) }),
      Skeletons.Box.X({
        className: `${pfx}__formula`,
        kids: bones(`${pfx}__bone--cell`, 1).concat(bones(`${pfx}__bone--input`, 1)),
      }),
      Skeletons.Box.Y({
        className: `${pfx}__grid`,
        kids: [
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
    // cold cache) downloads and mounts. A skeleton of the sheet itself —
    // menu row, toolbar pill, formula bar, grid — so the window has its
    // final shape from the first paint, with a centred "Loading…" card. It
    // covers the editor until it is ready (sheet_state._hideLoading), so
    // Casual's half-styled first render never shows.
    kids: [loadingSkeleton()],
  });

  const dialog = Skeletons.Wrapper.Y({
    className: `${_ui_.fig.group}__wrapper--modal dialog__wrapper--modal ${_ui_.fig.family}`,
    name: "dialog",
  });

  // In the Open-File Switcher frame, like every other viewer opened from a
  // folder (the panel lists this file's neighbours).
  return withFileSwitcher(_ui_, Skeletons.Box.Y({
    className: `${_ui_.fig.family}__main ${_ui_.fig.group}__main drive-popup`,
    radio: _a.parent,
    debug: __filename,
    kids: [header, body, dialog],
  }));
}
module.exports = __skl_editor_sheet;
