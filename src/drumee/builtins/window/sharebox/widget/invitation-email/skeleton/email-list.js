/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/sharebox/widget/invitation-email/skeleton/email-list.js
 * TYPE : Skelton
 * ===================================================================**/

function __skl_email_list (_ui_){

  let a = Skeletons.List.Smart({
      className   : `${_ui_.fig.family}__list emails form-input`,
      spinner     : true,
      sys_pn      : 'notification-email-list',
      formItem    : 'emails',
      dataType    : _a.array,
      itemsOpt    : {
        kind      : "widget_invitation_email_item",
        uiHandler : [_ui_],
        mode      : _ui_.mode
      }, 
      uiHandler   : [_ui_],
    })
  return a;
}
export default __skl_email_list;