// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/builtins/editor/json/skeleton/main
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_jed_main
//
// @param [Object] _ui_
//
// @return [Object] 
//
// ===========================================================
const __skl_jed_main = function(_ui_) {
  const buttons = [
    Skeletons.Note({ 
      service   : _e.cancel,
      content   : LOCALE.CLOSE, 
      className : `${_ui_.fig.family}__button cancel`
    }),
    Skeletons.Note({ 
      service   : _e.validate,
      content   : LOCALE.VALIDATE, 
      className : `${_ui_.fig.family}__button validate`
    })
  ];
  const footer = Skeletons.Box.X({
    kids      : buttons,
    className : `${_ui_.fig.family}__command`
  });

  const a = 
    Skeletons.Box.Y({
      className : `${_ui_.fig.family}__main`,
      kids :  [
        Skeletons.Box.X({ 
          sys_pn    : "ref-handle",
          className : `${_ui_.fig.family}__handle`
        }),

        Skeletons.Box.X({ 
          sys_pn    : "ref-content",
          className : `${_ui_.fig.family}__content`
        }),
        footer
      ]});
  return a;
};
module.exports = __skl_jed_main;
