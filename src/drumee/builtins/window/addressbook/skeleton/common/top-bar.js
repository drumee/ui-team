// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/addressbook/skeleton/common/top-bar.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_addressbook_common_topBar = function(_ui_) {
  
  const mode = _ui_._view;
  const figFamily = `${_ui_.fig.family}-topbar`;
  const figGroup = `${_ui_.fig.group}-topbar`;
    
  const notifier = { 
    kind      : 'addressbook_widget_notification',
    service   : 'invite-notifications',
    uiHanlder : _ui_
  };

  // Left section: icon, name, last update
  const leftSection = Skeletons.Box.X({
    className : `${figFamily}__left ${figGroup}__left`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : 'account_contacts',
        className : `${figFamily}__icon ${figGroup}__icon`
      }),
      Skeletons.Box.Y({
        className : `${figFamily}__info ${figGroup}__info`,
        kids      : [
          Skeletons.Note({
            sys_pn      : "ref-window-name",
            uiHandler   : _ui_,
            partHandler : _ui_,
            className   : `${figFamily}__title ${figGroup}__title`,
            content     : LOCALE.MY_CONTACTS || "My contacts"
          }),
          Skeletons.Note({
            sys_pn      : "ref-last-update",
            uiHandler   : _ui_,
            partHandler : _ui_,
            className   : `${figFamily}__last-update ${figGroup}__last-update`,
            content     : _ui_.mget('lastUpdate') || ""
          })
        ]
      })
    ]
  });

  // Right section: add, import, delete buttons
  const addButton = Skeletons.Button.Label({
    className : `${figFamily}__add-btn ${figGroup}__add-btn`,
    label     : LOCALE.ADD_NEW_CONTACTS || "Add new contacts",
    ico       : "plus",
    service   : 'add-contact',
    uiHandler : _ui_
  });

  const importButton = Skeletons.Button.Label({
    className : `${figFamily}__import-btn ${figGroup}__import-btn`,
    label     : LOCALE.IMPORT || "Import",
    ico       : "arrow-up",
    service   : 'import-address-book',
    uiHandler : _ui_
  });

  const deleteButton = Skeletons.Button.Svg({
    className : `${figFamily}__delete-btn ${figGroup}__delete-btn`,
    ico       : "trash",
    service   : 'delete-archive-list',
    uiHandler : _ui_
  });

  const settingsButton = Skeletons.Button.Svg({
    className : `${figFamily}__settings-btn ${figGroup}__settings-btn`,
    ico       : "setting",
    service   : _e.settings,
    uiHandler : _ui_
  });

  const rightSection = Skeletons.Box.X({
    className : `${figFamily}__right ${figGroup}__right`,
    kids      : [
      addButton,
      importButton,
      deleteButton,
      settingsButton
    ]
  });
  
  const a = Skeletons.Box.X({
    className : `${figFamily}__container ${figGroup}__container`,
    sys_pn    : _a.topBar,
    service   : _e.raise,
    dataset   : {
      view    : mode
    },
    debug     : __filename,
    kids      : [
      leftSection,
      rightSection,
      require('window/skeleton/topbar/control')(_ui_, 'c')
    ]});

  return a;
};

module.exports = __skl_addressbook_common_topBar;
