/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : src/drumee/builtins/window/sharebox/widget/invitation-email/skeleton/email-input.js
 * TYPE : Skelton
 * ===================================================================**/

function __skl_email_input (_ui_){
  // recipients = Skeletons.Box.Y
  // className : "#{pfx}__recipients" 
  // kids     : [
  //   Skeletons.List.Smart
  //     sys_pn    : "recipients-list"
  //     className : "#{pfx}__recipients-list"
  // ]

let invitation = {
  kind          :  'invitation_search',
  placeholder   : LOCALE.EMAIL,
  persistence   : _a.always,
  service       : 'invitation-item',
  sys_pn        : "invitation-search",
  preselect     : _ui_.mget(_a.preselect) || 0,
  addGuest      : _ui_.mget('addGuest') || 1,
  origin        : _ui_.mget(_a.type),
  // #itemsOpt      :
  // uiHandler     : [_ui_],
  api : { 
    service      : SERVICE.drumate.my_contacts,
    hub_id       : Visitor.id, 
  },
  apiAll : { 
    service      : SERVICE.drumate.my_contacts,
    value        : "%",
    hub_id       : Visitor.id
    // service      : SERVICE.contact.show_contact
    // hub_id       : Visitor.id, 
    // option       : _a.active
  }
}

  let a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__email-input_form `,
    debug      : __filename,
    kids       : [
      invitation
    ]
  })
  return a;
}
export default __skl_email_input;