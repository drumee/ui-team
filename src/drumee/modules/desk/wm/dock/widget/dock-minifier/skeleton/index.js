/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : src/drumee/modules/desk/wm/dock/widget/dock-minifier/skeleton/index.js
 * TYPE : Skelton
 * ===================================================================**/


function __skl_widget_dockMinifier (_ui_) {
  const menuFig = `${_ui_.fig.family}`

  let a = Skeletons.Box.X({
    className   : `${_ui_.fig.family}__main  application maker`,
    debug       : __filename,
    sys_pn      : 'dock-minifier-wrapper',
    dataset     : {
      state     : _a.closed
    },
    kids        : [
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__container`,
        kids : [
          require('./dock-minifier-menu').default(_ui_),
          require('./notification-counter').default(_ui_),
        ]
      })
    ]
  })
  return a;
}
export default __skl_widget_dockMinifier;