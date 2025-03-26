// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE :
// ==================================================================== *

const __account_data_quic_deletion = function(_ui_) {
  const pfx = `${_ui_.fig.family}-deletion`;
  const footer = Skeletons.Box.X({
    className: `${pfx}__footer`,
    kidsOpt: {
      uiHandler : _ui_
    },
    kids: [
      Skeletons.Note({
        content   : LOCALE.CONTINUE,
        className : `${pfx}__btn continue`,
        service   : 'request-delete'
      })
    ]});

  const a = Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug     : __filename,
    kids      : [
      require("./header")(_ui_),
      require("./steps")(_ui_),
      Skeletons.Box.Y({
        className: `${pfx}__content`,
        sys_pn : _a.content,
        partHandler : [_ui_]}),
      footer
    ]});

  return a; 
};

module.exports = __account_data_quic_deletion;
