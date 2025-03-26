/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __welcome_skl_go = function(_ui_, state) {
  if (state == null) { state = 1; }
  const a = Skeletons.Note({
    content   : "Go",
    className : `${_ui_.fig.family}__go small`,
    service   : "send",
    sys_pn    : "ref-button",
    uiHandler : [_ui_], 
    dataset   : { 
      error   : state
    }
  });

  return a;
};
module.exports = __welcome_skl_go;
