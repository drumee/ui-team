// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/desk/skeleton/common/topbar/user.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __topbar_user = function(_ui_) {
  const avatar = {
    kind     : KIND.avatar,
    sys_pn   : "ref-avatar"
  };
    //className: "#{_ui_.fig.family}__avatar"
  
  // notifier = 
  //   kind : 'addressbook_widget_notification'
  //   # service : "showInvite-notifications"
  //   label   : LOCALE.CONTACT_INVITATION || 'Contact Invitation'
  //   service   : "address-book"
  //   type      : "address-book"
  //   route     : 
  //     page      :'notification'
  //   uiHanlder : _ui_ 
  
  const a =  Skeletons.Box.X({
    className: `${_ui_.fig.family}__avatar`,
    kids: [
      avatar,
      // notifier
      require('./dropdown')(_ui_)
    ]
  });
      
  return a;
};

module.exports = __topbar_user;
