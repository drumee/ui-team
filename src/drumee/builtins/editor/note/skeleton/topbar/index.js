// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __skl_window_note_topbar = function (_ui_, icon) {
  let filename = _ui_.mget(_a.filename);
  if (_ui_.media) {
    filename = _ui_.media.mget(_a.filename);
  } else if (!filename) {
    const now = Dayjs().format("DD-MMM-YYYY à HH:MM");
    filename = LOCALE.NOTE_ON_DATE_X.format(now);
  }

  const figname = "topbar";
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}-${figname}__container ${_ui_.mget(_a.area)}`,
    sys_pn: _a.topBar,
    service: _e.raise,
    debug: __filename,
    kids: [
      require("./left")(_ui_),
      Skeletons.Box.X({
        className: `${_ui_.fig.group}-${figname}__title ${_ui_.fig.family}-${figname}__title`,
        service: _e.raise,
        kids: [
          Skeletons.Note({
            sys_pn: "ref-window-name",
            uiHandler: _ui_,
            partHandler: _ui_,
            className: _a.name,
            content: filename,
            active: 0
          })
        ]
      }),
      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.group}__wrapper--context dialog__wrapper--context`,
        name: "context",
        uiHandler: _ui_,
        partHandler: _ui_
      }),

      require('window/skeleton/topbar/control')(_ui_, 'sc')
    ]
  });
  return a;
};
module.exports = __skl_window_note_topbar;
