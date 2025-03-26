// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
//
// ===========================================================
const __topbar_breadcrumbs = function(_ui_) {

  const figFamily = `${_ui_.fig.family}-topbar-breadcrumbs`;



  const counterNote = Skeletons.Note({ 
    service    : "previous-page",
    sys_pn     : "back_button_counter",
    className  : `${figFamily}__digit`,
    innerClass : `${figFamily}__btn-counter`,
    uiHandler  : _ui_,
    content    : 0,
    dataset    : { 
      state    : _a.closed
    }
  });
 
  const backButton = Skeletons.Button.Svg({
    ico       : "arrow--map",
    className : `${figFamily}__icon breadcrumb-icon back arrow--map`,
    service   : "previous-page",
    uiHandler : _ui_
  });

  const nextButton = Skeletons.Button.Svg({
    ico       : "arrow--map",
    className : `${figFamily}__icon breadcrumb-icon next arrow--map`,
    service   : "next-page",
    uiHandler : _ui_
  });
  
  const a = Skeletons.Box.X({
    debug       : __filename, 
    className   : `${figFamily}__container breadcrumbs-container`,
    sys_pn      : "breadcrumbs-container",
    partHandler : _ui_,
    state       : 0,
    kids        : [
      Skeletons.Box.X({
        kids: [
          counterNote,
          backButton,
          nextButton
          ]})
    ]});

  return a;
};

module.exports = __topbar_breadcrumbs;
