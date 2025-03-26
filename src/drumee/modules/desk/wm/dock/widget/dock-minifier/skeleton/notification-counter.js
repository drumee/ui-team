/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : src/drumee/modules/desk/wm/dock/widget/dock-minifier/skeleton/notification-counter.js
 * TYPE : Skelton
 * ===================================================================**/


function __skl_widget_dockMinifierNotification (_ui_) {

  const counter = {
    debug      : __filename,
    service    : 'counter',
    sys_pn     : 'counter',
    className  : `${_ui_.fig.family}__digit `,
    innerClass : `${_ui_.fig.group}__btn-counter`,
    content    : `${_ui_.minimizedCount}`,
  };

  const a = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__notification_wrapper`,
    kids: [Skeletons.Note(counter)]
  });

  return a;
}
export default __skl_widget_dockMinifierNotification;