/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/widget/countdown/js/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_countdown_timer  (_ui_){
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          Skeletons.Note({
            className  : `${_ui_.fig.family}__counter`,
            sys_pn: 'counter',
            content: "00:00"
          })
          
        ]
      })
    ]
  })
  return a;
}
export default __skl_countdown_timer