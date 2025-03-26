// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/desk/wm/notification/widget/notification-window/skeleton/index.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __skl_notification_window_index = function (_ui_) {
  const pfx = _ui_.fig.family;
  const notificationData = _ui_.mget('notificationData');
  const a = Skeletons.Box.Y({
    className: `${pfx}__main`,
    debug: __filename,
    sys_pn: 'notification-window-container',
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__header`,
        kids: [
          Skeletons.Note({
            className: `${pfx}__note title`,
            content: LOCALE.NOTIFICATION_CENTER
          }),

          Skeletons.Button.Svg({
            ico: 'account_cross',
            className: `${pfx}__icon close account_cross`,
            service: 'close-notification-panel',
            uiHandler: [_ui_]
          })
        ]
      }),

      Skeletons.Box.X({
        className: `${pfx}__content`,
        kids: [
          _.isEmpty(notificationData) ?
            Skeletons.Note({
              className: `${pfx}__note no-notification`,
              content: LOCALE.NO_NOTIFICATION_MESSAGE 
            })
            :
            Skeletons.List.Smart({
              className: `${pfx}__list`,
              innerClass: `${pfx}__icons-scroll ${_ui_.fig.group}__icons-scroll`,
              sys_pn: 'notification-list',
              flow: _a.none,
              bubble: 1,
              timer: 1000,
              spinnerWait: 1000,
              spinner: true,
              signal: "list:event",
              vendorOpt: Preset.List.Orange_e,
              kids: notificationData,
              itemsOpt: {
                kind: 'notification_list_item',
                uiHandler: [_ui_]
              }
            })
        ]
      })
    ]
  });

  return a;
};

module.exports = __skl_notification_window_index;
