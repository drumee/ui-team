// ===========================================================
//
// ===========================================================
const __window_webinar_attendees = function(_ui_) {
  const items = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__attendees`,
    kids:[
      Skeletons.Note({
        content     : LOCALE.ATTENDEES, //"Membres du dossier partagé"
        className   : `${_ui_.fig.family}__attendees-title`
      }),
      Skeletons.List.Smart({
        className   : `${_ui_.fig.family}__attendees-list`,
        itemsOpt    : { 
          kind      : 'webrtc_attendee',
          uiHandler : _ui_
        },
        sys_pn      : "attendees",
        state       : 1,
        api         : _ui_.membersListApi()
      })
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
    trigger,
    items
  };

  return a;
};
module.exports = __window_webinar_attendees;
