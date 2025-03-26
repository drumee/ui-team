// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __skl_window_note_topbar = function(_ui_) {
  const pfx = `${_ui_.fig.family}-topbar`;
  let visibility = 0;
  let state      = 0;
  if(_ui_.mget('pin')) {
    state = 1;
    visibility = 1;
  }
  if (_ui_.media) { 
    ({visibility : 1});
  }
  const a = Skeletons.Box.X({
    debug : __filename,
    sys_pn     : "container-action",
    className  : `${pfx}__action`,
    service   : _e.raise,
    kids : [
      Skeletons.Button.Svg({
        ico       : "floppy",
        service   : _e.save,
        className : `${_ui_.fig.family}-topbar__icon save`,
        haptic : 1000
      }),
      Skeletons.Button.Svg({
        ico       : "drumee-tools_pin",
        service   : "pin-on",
        state,
        sys_pn    : "pin",
        className : `${_ui_.fig.family}-topbar__icon pin`,
        tooltips  : LOCALE.PIN_ON_DESK,
        haptic : 1000,
        dataset   : {
          visibility
        }
      })
    ]});
  return a;
};
module.exports = __skl_window_note_topbar;
