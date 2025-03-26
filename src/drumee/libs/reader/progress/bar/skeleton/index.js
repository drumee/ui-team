/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/libs/reader/progress/bar/js/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_progress_bar  (_ui_){
  let bar = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__row`,
    debug      : __filename,
    kids       : [
      Skeletons.Note({
        className: "loaded",
        sys_pn   : "loaded",
        content : "0",
      }),
      Skeletons.Note({
        className: "bar",
        sys_pn   : "percent",
        attrOpt:{
          id : `${_ui_._id}-progress-inner`
        },
        innerClass: "bar-value",
      }),
      Skeletons.Note({
        className: "total",
        sys_pn   : "total",
        content  : _ui_.mget('total') || "100",
      })
    ]
  })
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      bar,
      Skeletons.Note({
        className: "label",
        sys_pn   : "label",
        content  : _ui_.mget(_a.label)
      }),
    ]
  })
  return a;
}
module.exports = __skl_progress_bar;