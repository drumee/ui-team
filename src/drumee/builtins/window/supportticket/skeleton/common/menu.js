// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/supportticket/skeleton/common/menu.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_support_ticket_header_menu = function(_ui_) {
  
  const menuFig = `${_ui_.fig.family}-menu`;

  const menuTrigger = Skeletons.Button.Svg({
    ico       : 'drumee-contact_add',//'contact_add'
    className : `${menuFig}__icon ${menuFig}__trigger dropdown-toggle-icon contact_add`
  });

  const inviteContact = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service   : 'open-contact',
    type      : _a.invite,
    uiHandler : _ui_,
    kidsOpt   : {
      active    : 0
    },
    kids      : [
      Skeletons.Button.Svg({
        ico       : "account_contacts",
        className : `${menuFig}__icon ${menuFig}__invite-icon dropdown-icon contact`
      }),
            
      Skeletons.Note({
        className : `${menuFig}__name invitation`,
        content   : LOCALE.INVITE_CONTACT
      })
    ]});

  const createContact = Skeletons.Box.X({
    className : `${menuFig}__item`,
    service   : 'open-contact',
    type      : 'add-contact',
    uiHandler : _ui_,
    kidsOpt   : {
      active    : 0
    },
    kids      : [
      Skeletons.Button.Svg({
        ico       : "desktop_drumeememo",//"drumee-agenda"# "desktop_contactbook" 
        className : `${menuFig}__icon ${menuFig}__create-icon dropdown-icon contactbook`
      }),
            
      Skeletons.Note({
        className : `${menuFig}__name contactbook`,
        content   : LOCALE.CREATE_CONTACT_PROFILE
      })
    ]});

  const menuItems = Skeletons.Box.X({
    className : `${menuFig}__items-wrapper`,
    kids      : [
      Skeletons.Box.Y({
        kids  : [
          inviteContact,
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
      sys_pn      : "contact-dropdown",
      service     : "contact-menu",
      persistence : _a.none,
      trigger     : menuTrigger,
      items       : menuItems
    }]});
  
  return menu;
};

module.exports = __skl_support_ticket_header_menu;
