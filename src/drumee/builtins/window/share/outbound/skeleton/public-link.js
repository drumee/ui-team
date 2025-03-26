/*
 * decaffeinate suggestions:
 * DS101: Remove unnecessary use of Array.from
 * DS104: Avoid inline assignments
 * DS204: Change includes calls to have a more natural evaluation order
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *


// ===========================================================
//
// ===========================================================
const __sb_outbound_public_link = function(_ui_) {
  let needle, state;
  if ((needle = '*', Array.from(_.map(_ui_.mget(_a.sharees), _a.email)).includes(needle))) {
    state = 1;
  } else { 
    state = 0;
  }

  const a = Skeletons.Box.Y({
    debug : __filename,
    className   : `${_ui_.fig.family}__container-public-link u-ai-center`,
    radio       : 0,
    kids        : [
      Skeletons.Button.Svg({
        service      : "setup-public-link",
        ico          : "desktop__link",
        sys_pn       : "ref-button-link",
        state        : 1,
        className    : `${_ui_.fig.family}__icon link`,
        uiHandler    : _ui_,
        partHandler  : _ui_, 
        dataset      : {
          link       : state
        }
      })
    ]});
  return a;
};
module.exports = __sb_outbound_public_link;
