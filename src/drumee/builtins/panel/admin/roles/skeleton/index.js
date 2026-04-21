/* ==================================================================== *
* Widget skeleton automatically generated on 2026-04-17T02:40:02.212Z
* npm run add-widget -- --fig=admin.roles --dest=src/drumee/builtins/panel/admin/roles
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