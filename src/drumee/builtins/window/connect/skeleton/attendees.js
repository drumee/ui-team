// ===========================================================
//
// ===========================================================
const __window_connect_attendees = function(_ui_) {
  let state = 0;
  const list = Skeletons.List.Smart({
    className   : `${_ui_.fig.family}__attendees-list`,
    bubble      : 1,
    itemsOpt    : { 
      bubble    : 1,
      kind      : 'webrtc_attendee',
      uiHandler : _ui_,
      // service   : service
      state
    },
    sys_pn      : "attendees",
    timer       : 50,
    state
  });
  if (_ui_.mget(_a.callee)) {
    // service = 'invite'
    state = 1;
    list.api = { 
      service   : SERVICE.chat.chat_rooms, //SERVICE.contact.show_contact
      flag      : "contact",
      option    : _a.active,
      hub_id    : Visitor.id
    };
  }
  
  const items = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__attendees`,
    kids:[
      Skeletons.Note({
        content     : LOCALE.MY_CONTACTS,
        className   : `${_ui_.fig.family}__attendees-title`
      }),
      list
      //mute 
    ]});

  const trigger = Skeletons.Button.Svg({
    ico       : "desktop_group",
    className : `${_ui_.fig.family}-topbar__icon desktopgroup`
  });
  
  const a = { 
    kind        : KIND.menu.topic,
    className   : `${_ui_.fig.family}__list`,
    persistence : _a.once,
    flow        : _a.y,
    direction   : _a.down,
    axis        : _a.y,
    opening     : _e.click,
    sys_pn      : "attendees-menu",
    trigger,
    items
  };

  return a;
};
module.exports = __window_connect_attendees;
