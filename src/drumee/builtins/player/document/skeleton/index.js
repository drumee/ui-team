// ==================================================================== *
//   Copyright Xialia.com  2011-201ç
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __document_player = function(_ui_, msg) {
  let state;
  const topbar = require("../../skeleton/topbar")(_ui_);

  const list = Skeletons.List.Smart({ 
    className   : `${_ui_.fig.family}__list pdfViewer`,
    innerClass  : "drive-content-scroll",
    sys_pn      : _a.list,
    flow        : _a.none,
    vendorOpt  : Preset.List.Orange_e
  });

  if (!msg) { 
    state = 0;
  } else { 
    state = 1;
  }

  const wrapper = Skeletons.Wrapper.Y({
    className : `${_ui_.fig.family}__overlay`,
    sys_pn    : "overlay"
  });

  const main = Skeletons.Box.Y({
    className : `${_ui_.fig.group}__container`,
    sys_pn    : _a.content,
    kids      : [wrapper, list]});

  const progress =  Skeletons.Box.X({
    className: `${_ui_.fig.family}__progress-container`,
    sys_pn    : "progress",
    service   : "hide-progress",
    dataset : { 
      state
    },
    kids : [
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__progress-bar`,
        sys_pn    : "progress-bar"
      }),
      Skeletons.Note({
        content: msg || LOCALE.PROCESSING,
        className: `${_ui_.fig.family}__progress-text`,
        sys_pn    : "progress-text"
      })
    ]});

  const a = Skeletons.Box.Y({
    debug      : __filename,
    className  : `${_ui_.fig.group}__main`,
    handler    : {
      part     : _ui_
    },
    kids:[topbar, main, progress]});

  return a;
};
module.exports = __document_player;
