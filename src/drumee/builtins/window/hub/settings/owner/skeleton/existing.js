// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/hub/admin/settings/administrator/skeleton/existing
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// __hub_admin_existing
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __hub_admin_existing = function(manager) {
  const prefix = manager.fig.family;
  const contacts = { 
    kind      : 'contacts_list',
    className : `${prefix}__existing-list`,
    //listClass : 'sharee-new-contact'
    flow      : _a.y,
    itemsOpt  : {
      kind      : 'invitation_contact',
      className : `${prefix}__existing-administrator`,
      figPrefix : prefix
    },
      // skeleton  : require('desk/contact/item/skeleton/name-only')
    styleOpt: {
      width : _K.size.full
    }, 
    hub_id  : manager.model.get(_a.hub_id),
    signal  : _e.ui.event, 
    items   : manager.members,
    handler : {
      uiHandler : manager
    },
    api     : {}
  };
  const a = Skeletons.Box.Y({
    uiHandler : manager,
    cn    : "u-ai-center u-jc-center w-100 mb-20 ml-16 mr-14",
    debug : __filename,
    kids  : [
      contacts,
      Skeletons.Note({
        state     : 0,
        uiHandler     : manager,
        service   : _e.add,
        content   : LOCALE.ADD_ADMINISTRATORS,
        cn        : 'mt-15 share-popup__modal-add-button'
      }),
      Skeletons.Box.Y({
        cn        : "share-popup__modal-options-content",
        sys_pn    : "options-content"
      })
    ]
  });

  return a;
};
module.exports = __hub_admin_existing;
