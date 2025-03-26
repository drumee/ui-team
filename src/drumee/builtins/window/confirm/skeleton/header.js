// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


const __skl_window_confirm_topbar = function(_ui_) {
  // (hbfc) h ->header, b -> body, f -> footer c -> close  
  const mode = _ui_.mget(_a.mode) || "hbfcx";
  const m = new RegExp(`[${mode}]`);
  const figname = "topbar";
  const pfx = `${_ui_.fig.group}-confirm`;
  const a = Skeletons.Box.X({
    className : `${pfx}-${figname}__container`,
    sys_pn    : "topbar",
    debug     : __filename,
    service   : _e.raise,
    kids : [
      Skeletons.Box.X({
        className: `${pfx}__title forbiden`,
        kids: [
          Skeletons.Note({
            sys_pn    : "window-label",
            className : _a.name,
            content   : _ui_.mget(_a.title) || ""
          })
        ]})
    ]});
  if (m.test('x')) {
    a.kids.unshift(Preset.Button.Close(_ui_));
  } else if (m.test('c')) {
    a.kids.unshift(require('window/skeleton/topbar/control')(_ui_, 'c'));
  }

  return a;
};
module.exports = __skl_window_confirm_topbar;
