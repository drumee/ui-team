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
const __hub_admin_existing = function(_ui_) {
  const prefix = _ui_.fig.family;
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
    hub_id  : _ui_.model.get(_a.hub_id),
    signal  : _e.ui.event, 
    items   : _ui_.members,
    uiHandler : _ui_, 
    api     : {}
  };

  const a = Skeletons.Box.Y({
    uiHandler : _ui_,
    cn    : "u-ai-center u-jc-center w-100 mb-20 ml-16 mr-14",
    debug : __filename,
    kids  : [
      Preset.Button.Close(_ui_),
      contacts,
      Skeletons.Note({  
        state     : 0,
        uiHandler     : _ui_,
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
