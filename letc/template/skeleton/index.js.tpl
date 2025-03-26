// ================================================================== *
//   Copyright Xialia.com  2011-<%= year %>
//   FILE : <%= filename %>
//   TYPE : Skelton
// ===================================================================**/

/**
 * 
 * @param {*} _ui_ 
 * @returns 
 */

function __skl_<%= group %>_<%= name %>(_ui_) {
  const a = Skeletons.Box.Y({
    className  : `#{_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className  : `#{_ui_.fig.family}__container`,
        kids : [
          Skeletons.Note({
            className  :`#{_ui_.fig.family}__text`,
            content : "Hello world!"
          }),
          Skeletons.Button.Svg({
            className  :`#{_ui_.fig.family}__icon`,
            ico : "message_smile"
          }),
        ]
      })
    ]
  })

  return a;
}
module.exports = __skl_<%= group %>_<%= name %>;
