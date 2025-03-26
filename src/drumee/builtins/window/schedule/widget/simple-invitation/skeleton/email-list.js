/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/sharebox/widget/invitation-email/skeleton/email-list.js
 * TYPE : Skelton
 * ===================================================================**/

function __skl_email_list (_ui_){

  let recipients = Skeletons.Box.Y({
  className : `${_ui_.fig.family}__recipients`,
  kids     : [
    Skeletons.List.Smart({
      sys_pn    : `recipients-list`,
      className : `${_ui_.fig.family}__recipients-list`,
      uiHandler : [_ui_],
      itemsOpt    : { 
        uiHandler : [_ui_],
        mode      : _ui_.mget(_a.mode)
      }  
    })
  ]
})
  return recipients;
}
export default __skl_email_list;