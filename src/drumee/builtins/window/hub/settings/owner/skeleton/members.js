// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/#{_ui_.prefix}/settings
//   TYPE : 
// ==================================================================== *

//------------------------------------
//
//------------------------------------
const __skl_invitation = function(_ui_) {
  const a = { 
    kind      : 'invitation',
    debug     : __filename, 
    className : `${_ui_.fig.family}__invitation`,
    media     : _ui_.media,
    hub       : _ui_.hub,
    sharees   : _ui_.mget(_a.users),
    mode      : _a.hub, 
    topLabel  : LOCALE.CHOOSE_NEW_OWNER,
    sys_pn    : "invitation", 
    closeButton : true,
    shareeItem : {
      uiHandler : _ui_,
      service   :  _e.commit,
      map      : {
        users  : _a.id
      }
    },
    api       : { 
      service : SERVICE.hub.get_members_by_type,
      type    : "all",
      hub_id  : _ui_.mget(_a.hub_id)
    },
    uiHandler : _ui_, 
    service   : _e.update
  };
  // if _ui_.mget(_a.privilege) & (_K.permission.owner)
  //   a.bottomLabel = LOCALE.CHANGE
  //   a.service = "change-owner"
  // else 
  //   a.bottomLabel = LOCALE.LEAVE
  //   a.service = "leave-hub"
  return a;
};
  
module.exports = __skl_invitation;
