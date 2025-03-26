// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/endpoint/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_webrtc_screen = function(_ui_) {
  const type = _ui_.mget(_a.type);
  const sound = { 
    className : `${_ui_.fig.family}__sound-analyzer`,
    kind      : "sound_analyzer",
    stream    : _ui_.mget(_a.stream)
  };

  const micro =  Skeletons.Button.Svg({
    className : `${_ui_.fig.family}__micro ${type}`,
    ico       : "micro",
    sys_pn    : "micro",
    state     : 1
  });

  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__avatar`,
        sys_pn    : "avatar"
      }),

      Skeletons.Element({
        tagName: _a.video,
        className : `${_ui_.fig.family}__video ${type}`,
        sys_pn : _a.video,
        attrOpt: { 
          autoplay : ""
        }
      }),

      Skeletons.Note({
        sys_pn    : _a.label,
        content   : _ui_.mget(_a.label),
        className : `${_ui_.fig.family}__label ${type}`
      }),
      sound,
      micro
    ]});
  return a;
};
module.exports = __skl_webrtc_screen;