// ============================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/builtins/desk/skeleton/main
//   TYPE : 
// ============================================================== *


// ===========================================================
//
// ===========================================================
const __skl_notification_panel_index = function(_ui_) {
  const pfx = _ui_.fig.family;
  let dataCount = 0;
  if (_ui_.data !== null) { 
    dataCount = _ui_.data.length;
  }

  const notificationIcon = Skeletons.Box.X({
    debug     : __filename,
    className   : `${_ui_.fig.family}__container`,
    kids : [
      Skeletons.Button.Svg({
        ico       : 'drumee-sharebox-bell',//desktop_delete'
        className : `${pfx}___ico_button notification-bell`, 
        service   : 'open-notification-panel',
        sys_pn    : "notification-bell-ico",
        uiHandler : _ui_
      }),
      
      Skeletons.Note({
        service    : 'counter',
        sys_pn     : 'notification-counter',
        className  : `${_ui_.fig.family}__digit `,
        innerClass : `${_ui_.fig.group}__btn-counter`,
        content    : dataCount,
        dataset    : { 
          state    : dataCount ? _a.open : _a.closed
        }
      })
    ]});

  const a = Skeletons.Box.Y({
    className  : `${pfx}__main`,
    sys_pn     : "notification-container",
    debug     : __filename,
    kids: [
      notificationIcon,
      Skeletons.Wrapper.Y({
        className: `${_ui_.fig.family}__overlay`,
        name :"notification_overlay"
      })
    ]});



  return a;
};
module.exports = __skl_notification_panel_index;
