// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : builins/window/addressbook/skeleton/common/menu
//   TYPE : Skeleton
// ==================================================================== *

const __skl_addressbook_common_menu = function(_ui_) {
  
  let importAddressBook, inviteContact;
  const menuFig = `${_ui_.fig.family}-menu`;

  const menuTrigger = Skeletons.Button.Svg({
    ico       : 'drumee-contact_add',
    className : `${menuFig}__icon ${menuFig}__trigger dropdown-toggle-icon contact_add`
  });

  if (Visitor.canShow('invite-user')) {
    inviteContact = Skeletons.Box.X({
      className : `${menuFig}__item`,
      service   : 'invite_someone',
      uiHandler : _ui_,
      kidsOpt   : {
        active  : 0
      },
      kids      : [
        Skeletons.Button.Svg({
          ico       : 'account_contacts',
          className : `${menuFig}__icon ${menuFig}__invite-icon dropdown-icon account_contacts`
        }),
              
        Skeletons.Note({
          className : `${menuFig}__name`,
          content   : LOCALE.INVITE_CONTACT
        })
          
      ]});
  }

  let _createContactLabel = LOCALE.CREATE_CONTACT_PROFILE;
  if (Visitor.isHubUser()) {
    _createContactLabel = LOCALE.CREATE_CONTACT;
  }

  const createContact = Skeletons.Box.X({
    className : `${menuFig}__item`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'desktop_drumeememo',
        className : `${menuFig}__icon ${menuFig}__create-icon dropdown-icon contactbook`
      }),
            
      Skeletons.Note({
        className : `${menuFig}__name contactbook`,
        content   : _createContactLabel,
        service   : 'create_contact'
      })
    ]});
    
  if (Visitor.canShow('import-contact-computer')) {
    importAddressBook = Skeletons.Box.X({
      className : `${menuFig}__item`,
      kids      : [
        Skeletons.Button.Svg({
          ico       : 'two-users',
          className : `${menuFig}__icon ${menuFig}__create-icon dropdown-icon contactbook`
        }),
              
        Skeletons.Note({
          className : `${menuFig}__name contactbook`,
          content   : LOCALE.IMPORT_FROM_COMPUTER,
          service   : 'import-address-book'
        })
      ]});
  }

  // if (Visitor.canShow('import-contact-google')) {
  //   importFromGoogle = Skeletons.Box.X({
  //     className : `${menuFig}__item`,
  //     kids      : [
  //       Skeletons.Button.Svg({
  //         ico       : 'raw-google',
  //         className : `${menuFig}__icon ${menuFig}__create-icon dropdown-icon contactbook`
  //       }),
              
  //       Skeletons.Note({
  //         className : `${menuFig}__name contactbook`,
  //         content   : LOCALE.IMPORT_GOOGLE_CONTACT,
  //         service   : 'import-from-google'
  //       })
  //     ]});
  // }

  const separator = Skeletons.Box.X({
    className : `${menuFig}__separator`});

  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        className : `${menuFig}__items`,
        kids  : [
          inviteContact,
          importAddressBook,
          //importFromGoogle,
          separator,
          createContact
        ]}) 
    ]});

  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${menuFig}__dropdown ${_ui_.fig.group}__dropdown`,
    kids      : [{
      kind        : KIND.menu.topic,
      className   : `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
      flow        : _a.y,
      opening     : _e.click,
      sys_pn      : 'contact-dropdown',
      service     : 'contact-menu',
      persistence : _a.none,
      trigger     : menuTrigger,
      items       : menuItems
    }]});
  
  return menu;
};

module.exports = __skl_addressbook_common_menu;
