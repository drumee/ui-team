// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : src/drumee/builtins/window/addressbook/widget/contact-detail/skeleton/action-menu.coffee
//   TYPE : Skeleton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_contact_detail_action_menu = function(_ui_, contact) {
  let menuItems, menuTrigger;
  const menuFig = `${_ui_.fig.family}-menu`;
  
  if (contact.is_same_domain === 1) {
    menuTrigger = Skeletons.Button.Svg({
      ico       : 'b2b-contact-action-menu',
      className : `${menuFig}__icon ${menuFig}__trigger trigger-icon ap-member-action-menu`
    });
  } else {
    menuTrigger = Skeletons.Button.Svg({
      ico       : 'drumee-user-setting',
      className : `${menuFig}__icon ${menuFig}__trigger trigger-icon ap-member-action-menu`,
      service   : 'action-menu',
      uiHandler : _ui_
    });
  }
  
  const sameDomainInfo = Skeletons.Note({
    className : `${menuFig}__note same-domain-info`,
    content   : LOCALE.INFO_MANAGED_BY_ADMINISTRATORS
  });

  const modifyContact = Skeletons.Box.X({
    className   : `${menuFig}__item`,
    service     : _a.edit,
    uiHandler   : _ui_,
    kidsOpt     : {
      active      : 0
    },
    kids        : [
      Skeletons.Note({
        className : `${menuFig}__note menu-item modify-data`,
        content   : LOCALE.MODIFY_DATA
      })
    ]});

  let blockContact = '';
  if ((contact.type === 'my_contact') && (contact.status === _a.active)) {
    let _blockService = _a.block;
    let _blockContent = LOCALE.BLOCK;

    if (contact.is_blocked === 1) {
      _blockService = 'unblock';
      _blockContent = LOCALE.UNBLOCK;
    }

    blockContact = Skeletons.Box.X({
      className  : `${menuFig}__item`,
      service    : _blockService,
      uiHandler  : _ui_,
      kidsOpt    : {
        active  : 0
      },
      kids       : [
        Skeletons.Note({
          className : `${menuFig}__note menu-item block`,
          content   : _blockContent
        })
      ]});
  }
  
  let archiveContact = '';
  if (contact.type === 'my_contact') {
    let _archiveService = _a.archived;
    let _archiveContent = LOCALE.ARCHIVE;
    
    if (contact.is_archived === 1) {
      _archiveService = 'unarchive';
      _archiveContent = LOCALE.UNARCHIVE;
    }
    
    archiveContact = Skeletons.Box.X({
      className  : `${menuFig}__item`,
      service    : _archiveService,
      uiHandler  : _ui_,
      kidsOpt    : {
        active  : 0
      },
      kids       : [
        Skeletons.Note({
          className : `${menuFig}__note menu-item archive`,
          content   : _archiveContent
        })
      ]});
  }
  
  let deleteContact = '';
  if (contact.type === 'my_contact') {
    deleteContact = Skeletons.Box.X({
      className  : `${menuFig}__item`,
      service    : 'delete-contact',
      uiHandler  : _ui_,
      kidsOpt    : {
        active  : 0
      },
      kids       : [
        Skeletons.Note({
          className : `${menuFig}__note menu-item delete`,
          content   : LOCALE.DELETE
        })
      ]});
  }
  
  if (contact.is_same_domain === 1) {
    menuItems = Skeletons.Box.X({
      className : `${menuFig}__items-wrapper`,
      kids      : [
        Skeletons.Box.Y({
          className : `${menuFig}__item-wrapper`,
          kids      : [
            sameDomainInfo,
            archiveContact
          ]})
      ]});
  } else {
    menuItems = Skeletons.Box.X({
      className : `${menuFig}__items-wrapper`,
      kids      : [
        Skeletons.Box.Y({
          className : `${menuFig}__item-wrapper`,
          kids      : [
            modifyContact,
            blockContact,
            archiveContact,
            deleteContact
          ]})
      ]});
  }

  const menu = Skeletons.Box.X({
    debug     : __filename,
    className : `${menuFig}__dropdown ${_ui_.fig.group}__dropdown`,
    kids      : [{
      kind        : KIND.menu.topic,
      className   : `${menuFig}__wrapper ${_ui_.fig.group}__wrapper`,
      flow        : _a.y,
      opening     : _e.click,
      sys_pn      : 'contact-action-dropdown',
      service     : 'contact-action-menu',
      persistence : _a.none,
      trigger     : menuTrigger,
      items       : menuItems,
      offsetY     : 20
    }]});
  
  return menu;
};

module.exports = __skl_contact_detail_action_menu;