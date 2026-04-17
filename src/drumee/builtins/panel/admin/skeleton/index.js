/* ==================================================================== *
* Widget skeleton automatically generated on 2026-04-17T02:21:58.824Z
* npm run add-widget -- --fig=admin.main --dest=src/drumee/builtins/panel/admin/main
* ==================================================================== */

/**
 * 
 * @param {*} ui 
 * @returns 
 */

module.exports = function (ui) {
  return Skeletons.Box.Y({
    className  : `${ui.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `${ui.fig.family}__container`,
        kids : [
          Skeletons.Note({
            className  :`${ui.fig.family}__text`,
            content : "Hello world!"
          }),
          Skeletons.Button.Svg({
            className  :`${ui.fig.family}__icon`,
            ico : "message_smile"
          }),
        ]
      })
    ]
  })
}