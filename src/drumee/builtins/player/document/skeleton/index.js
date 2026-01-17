
const __document_player = function(ui, msg) {
  let state;
  const topbar = require("../../skeleton/topbar")(ui);

  const list = Skeletons.List.Smart({ 
    className   : `${ui.fig.family}__list pdfViewer`,
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
    className : `${ui.fig.family}__overlay`,
    sys_pn    : "overlay"
  });

  const main = Skeletons.Box.Y({
    className : `${ui.fig.group}__container`,
    sys_pn    : _a.content,
    kids      : [wrapper, list]});

  const progress =  Skeletons.Box.X({
    className: `${ui.fig.family}__progress-container`,
    sys_pn    : "progress",
    service   : "hide-progress",
    dataset : { 
      state
    },
    kids : [
      Skeletons.Box.X({
        className: `${ui.fig.family}__progress-bar`,
        sys_pn    : "progress-bar"
      }),
      Skeletons.Note({
        content: msg || LOCALE.PROCESSING,
        className: `${ui.fig.family}__progress-text`,
        sys_pn    : "progress-text"
      })
    ]});

  const a = Skeletons.Box.Y({
    debug      : __filename,
    className  : `${ui.fig.group}__main`,
    handler    : {
      part     : ui
    },
    kids:[topbar, main, progress]});

  return a;
};
module.exports = __document_player;
