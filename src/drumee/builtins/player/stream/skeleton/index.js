// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/screen/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_player_stream = function(_ui_) {
  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({ 
        className : `${_ui_.fig.family}__user`,
        kids      : [
          Skeletons.Box.Y({
            className : `${_ui_.fig.family}__avatar`,
            sys_pn    : "avatar"
          }),
          Skeletons.Note({
            content   : _ui_.mget(_a.label) || '',
            sys_pn    : _a.label,
            className : `${_ui_.fig.family}__label`
          })
        ]}),
      Skeletons.Element({
        tagName: _a.video,
        className : `${_ui_.fig.family}__video `,
        sys_pn : _a.video,
        attrOpt: { 
          autoplay : ""
        },
        dataset: {
          status   : _a.idle, 
          size     : _ui_.mget(_a.size)
        }
      }),
      Skeletons.Button.Svg({
        className : `${_ui_.fig.family}__micro`,
        ico       : "micro",
        sys_pn    : "micro",
        state     : 1
      })      
    ]});
  return a;
};
module.exports = __skl_player_stream;