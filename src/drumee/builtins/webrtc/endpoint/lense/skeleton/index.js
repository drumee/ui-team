// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/screen/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_stream_mirror = function(_ui_) {
  let avatar;
  let user = 0;
  if (_ui_.mget(_a.uid)) {
    avatar = [{
      kind      : KIND.profile,
      id        : _ui_.mget(_a.uid),
      type      : _a.thumb,
      active    : 0
    }
    ];
    user = 1;
  }
  const sound = { 
    className : `${_ui_.fig.family}__sound-analyzer`,
    kind      : "sound_analyzer",
    stream    : _ui_.stream,
    sys_pn    : "sound"
  };

  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({ 
        className : `${_ui_.fig.family}__user`,
        sys_pn     : "peer-wrapper",
        kids      : [
          Skeletons.Note({
            content   : _ui_.mget('uname') || '',
            sys_pn    : 'uname',
            className : `${_ui_.fig.family}__uname`
          }),

          Skeletons.Box.Y({
            className : `${_ui_.fig.family}__avatar`,
            sys_pn    : "avatar",
            kids      : avatar
          }),

          Skeletons.Note({
            content   : _ui_.mget(_a.label) || '',
            sys_pn    : _a.label,
            className : `${_ui_.fig.family}__label webinar`
          })
            // dataset   :
            //  user    : user
        ]}),
      Skeletons.Element({
        tagName: _a.video,
        className : `${_ui_.fig.family}__video`,
        sys_pn : _a.video,
        attrOpt: { 
          autoplay : ""
        },
        dataset: {
          status   : _a.idle, 
          state    : 0,
          size     : _ui_.mget(_a.size)
        }
      }),
      sound,
      Skeletons.Button.Svg({
        className : `${_ui_.fig.family}__muted`,
        ico       : "micro",
        sys_pn    : "muted",
        state     : _ui_.mget(_a.mute)
      })      
    ]});
  return a;
};
module.exports = __skl_stream_mirror;