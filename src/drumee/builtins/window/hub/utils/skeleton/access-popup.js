// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/skeleton/project-room/access-popup
//   TYPE : 
// ==================================================================== *

// ===========================================================
// __project_room_access_popup
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __project_room_access_popup = function(manager) {
  const svg_option_icon = {
    width: _K.size.full,
    height: 30,
    padding: 0
  };

  const close_modal = SKL_SVG("account_cross", {
    className : "popup__close",
    service: "close-settings-popup"
  }, {
    width: 36,
    height: 36,
    padding: 12
  });

  const channel = _.uniqueId();

  const form = { 
    kind      : KIND.form,
    flow      : _a.vertical,
    name      : 'access-type',
    signal    : _e.ui.event,
    service   : 'access-type',
    sys_pn    : 'access-type',
    handler   : {
      uiHandler   : manager
    },
    kids      : [
      SKL_SVG_LABEL("account_check", {
        radio         : channel,
        initialState  : 1,
        label         : "LOCALE.EVERYONE_ALREADY_ADDED",
        name          : "current",
        service       : 'current',
        className     : 'rights__checkbox u-ai-center'
      }, svg_option_icon),
      SKL_SVG_LABEL("account_check", {
        radio         : channel,
        label         : "LOCALE.FUTURE_MEMBERS",
        name          : "future",
        service       : 'future',
        className     : 'rights__checkbox u-ai-center'
      }, svg_option_icon)
    ]
  };

  const btn_group = { 
    kind      : KIND.box,
    flow      : _a.horizontal,
    className : "popup__btn-block u-jc-sb",
    kids      : [
      SKL_Note("close-settings-popup", LOCALE.CANCEL, {className: "btn btn--regular"}),
      SKL_Note("accept-validate-access", LOCALE.CONFIRM, {className: "btn btn--confirm"})
    ]
  };

  const a = {  
    kind      : KIND.box,
    flow      : _a.vertical,
    name      : 'access-popup',
    signal    : _e.ui.event,
    className : "popup popup--small popup--rounded",
    kids      : [
      SKL_Box_V(manager, {
        className: "popup__inner popup__inner--small",
        sys_pn    : "privilege-access",        
        kids: [
          close_modal,
          SKL_Note(null, "Change the rights for:", {className: "popup__header"}),
          form,
          btn_group
        ]
      })
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'desk/skeleton/project-room/access-popup'); }
  return a;
};
module.exports = __project_room_access_popup;