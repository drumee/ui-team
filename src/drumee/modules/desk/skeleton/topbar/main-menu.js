// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : src/drumee/builtins/desk/skeleton/top-bar/main-menu
//   TYPE : Skeleton
// ==================================================================== *

const __skl_top_bar = function(_ui_){

//  notificationVisibility = if _ui_.model.get("notifications") is 0 then "__hidden"
  let addContact;
  const pfx = `${_ui_.fig.group}-topbar`;
  if (Visitor.canShow('invite-user')) {
    addContact = Skeletons.Button.Svg({
      ico       : "drumee-add-contact",
      className : `${pfx}__icon contact`,
      respawn   : "window_contact",
      service   : _e.launch,
      exclude   : 'window_addressbook'
    });
  }
  
  const settings_menu = { 
    kind        : KIND.menu.topic,
    className   : `${pfx}__menu-settings`,
    persistence : _a.once,
    opening     : _e.click,
    flow        : _a.x,
    axis        : _a.x, 
    sys_pn      : 'menu-settings',
    opening     : _e.click,
    direction   : _a.left,
    trigger     : Skeletons.Button.Svg({
      ico       : 'desktop_desksettings',
      className : `${pfx}__icon settings`
    }),
    items       : require("desk/skeleton/common/topbar/settings")(_ui_)
  };

  if (Visitor.isMobile()) {
    settings_menu.direction = _a.down;
  }

  const network = {kind : 'notifier_network'};

  const search_icon = Skeletons.Button.Svg({
    className :`${pfx}__searchbox icon`, 
    ico : "lens"
  });

  const search = {
    kind        : KIND.search,
    flow        : _a.x,
    className   :  `${pfx}__searchbox entry` + "titi", 
    placeholder : LOCALE.SEARCH,
    listClass   : "found-box",
    sys_pn      : 'search-box',
    mode        : _a.interactive,
    interactive : _a.service,
    service     : _e.search,
    uiHandler    : [_ui_]
  };

  const search_box = Skeletons.Box.X({
    className   : `${pfx}__searchbox inner`, 
    kids : [
      search_icon,
      search,
      network
    ]});



  const a = Skeletons.Box.X({
    className   : `${pfx}__main-menu`,
    sys_pn      : "main-menu",
    debug       : __filename,
    active      : 0,
    kids: [
      addContact,
      Skeletons.Box.X({
        className : `${pfx}__searchbox outer`,
        service   : 'open-search', 
        kids: [
          search_box
        ]}),
      settings_menu 
    ]
  });
  return [a];
};

module.exports = __skl_top_bar;
