// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/builtins/desk/skeleton/top-bar/main-menu
//   TYPE :mobile
// ==================================================================== *

const __skl_mobile_topbar = function(_ui_){

//  notificationVisibility = if _ui_.model.get("notifications") is 0 then "__hidden"
  const pfx = `${_ui_.fig.group}-topbar`;
  const icon_options = {
    width   : 35,
    height  : 35,
    padding : 9
  };

  // plus_menu = 
  //   kind        : KIND.menu.topic
  //   className   : "#{pfx}__menu right"
  //   persistence : _a.once
  //   flow        : _a.x
  //   opening     : _e.click
  //   sys_pn      : 'menu-plus'
  //   direction   : _a.left
  //   axis        : _a.x 
  //   opening     : _e.click
  //   trigger     : Skeletons.Button.Icon({
  //     ico       : 'editbox_list-plus'
  //     className : "#{pfx}__icon plus" #'desk__input-icon'
  //   }, icon_options)
  //   items       : require("desk/skeleton/common/topbar/add-items")()

  const settings_menu = { 
    kind        : KIND.menu.topic,
    className   : `${pfx}__menu left`,
    persistence : _a.once,
    opening     : _e.click,
    flow        : _a.x,
    axis        : _a.x, 
    sys_pn      : 'menu-settings',
    opening     : _e.click,
    // signal      : _e.ui.event
    direction   : _a.right,
    trigger     : Skeletons.Button.Icon({
      ico       : 'desktop_desksettings',
      className : `${pfx}__icon settings`
    }, icon_options),
    items       : require("desk/skeleton/common/topbar/settings")(_ui_)
  };

  const network = {kind : 'notifier_network'};

  // search_box = Skeletons.Box.X({
  //       className : "#{pfx}__searchbox outer" #"desk__input-wrapper" # mx-30"
  //       service   : 'open-search' 
  //       kids: [
  const search_box =  Skeletons.Box.X({
    className   : `${pfx}__searchbox inner`, 
    kids : [
      //network
      Skeletons.Entry({
        className   : `${pfx}__searchbox entry`, 
        placeholder : LOCALE.SEARCH,
        sys_pn      : 'search-box',
        mode        : _a.interactive,
        service     : _e.search,
        uiHandler    : _ui_,
        autocomplete : _a.off
      }),
      network
    ]});


  // notifier_share  =
  //   kind      : 'notifier_share'
  //   className : ""
  //   sys_pn    : "notifier"
  //   service   : "open-sharebox"
    // skeleton  : require('./notifier')

  const actions = Skeletons.Box.X({
    className   : `${pfx}__main`, //"desk__filter-input"
    sys_pn      : "main-menu",
    debug       : __filename,
    active      : 0,
    kids: [
      //notifier_share
      settings_menu 
      //plus_menu
      // Skeletons.Button.Icon({
      //   ico       : 'desktop_delete'
      //   className : "#{pfx}__icon trash" #'desk__input-icon desk__input-icon--settings'
      //   service   : _e.trash
      //   sys_pn    : "ref-bin"
      //   uiHandler : _ui_
      // }, icon_options)
    ]
  });
  // a =  Skeletons.Box.Y
  //   debug       : __filename
  //   active      : 0
  //   kids : [
  //     search_box, actions
  //   ]
  return [search_box, actions];
};

module.exports = __skl_mobile_topbar;
