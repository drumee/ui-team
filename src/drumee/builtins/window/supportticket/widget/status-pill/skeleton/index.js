/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/builtins/window/bigchat/widget/status-pill/js/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_status_pill  (_ui_){
  status = _ui_.mget(_a.status) || ''
  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main `,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container ${_ui_.mget(_a.type)}-type ${status}`,
        dataset    :  {
          type    : _ui_.mget(_a.type),
          status  : status
        },
        kids : [
          Skeletons.Note({
            className : `${_ui_.fig.family}__status`,
            content   : LOCALE[status.toUpperCase()] || status
          })
        ]
      })
    ]
  })
  return a;
}
module.exports = __skl_status_pill
''