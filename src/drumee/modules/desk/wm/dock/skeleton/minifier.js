/* ==================================================================== *
#   Copyright Xialia.com  2011-2021
#   FILE : src/drumee/modules/desk/wm/dock/skeleton/minifier.js
#   TYPE : Skeleton
# ==================================================================== */

const __dock_widget_minifier = function(_ui_) {
  const button_class = `${_ui_.fig.family}__button launcher`
  const a = Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__container`,
    kids: [
      {
        kind   : 'dock_minifier',
        sys_pn : 'dock_minifier'
      }
    ]
  })
  return a
}

export default __dock_widget_minifier
