/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/confirm-leave
//   TYPE : 
// ==================================================================== *

// ==================================================
// ==================================================

// ===========================================================
// __desk_skl_confirm_leave
//
// @param [Object] _ui_
// @param [Object] question
// @param [Object] warning
// @param [Object] page
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __desk_skl_confirm_leave = function(_ui_, target) {
  let vars;
  if (target.model != null) {
    vars = target.model.get(_a.vars);
  } else { 
    vars = target;
  }
  const a = Skeletons.Box.Y({
    style     : {
      'z-index' : 20000
    },

    className : `${_ui_.fig.family}__popup confirm u-jc-center u-ai-center`, //"popup__inner popup__inner--small pb-24 pt-30 px-40 u-jc-center u-ai-center"
    kids    : [
      Skeletons.Note(vars.message, "text mb-8"),
      Skeletons.Box.X({
        className: "buttons mb-12 u-ai-center",
        kids: [
          Skeletons.Note({
            service   : "close-popup",
            content   : LOCALE.CANCEL,
            uiHandler     : _ui_, 
            className : "p-10 btn--regular mr-10 button clickable"
          }),
          Skeletons.Note({
            content   : LOCALE.YES,
            href      : vars.href,
            attrOpt : { 
              target : '_blank'
            },
            className : "p-10 btn--confirm ml-10 button clickable"
          })
        ]
      })
    ]});
  return a;
};
module.exports = __desk_skl_confirm_leave;
