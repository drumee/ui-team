// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/screen/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_stream_local = function(_ui_) {
  const sound = { 
    className : `${_ui_.fig.family}__sound-analyzer`,
    kind      : "sound_analyzer",
    stream    : _ui_.stream,
    sys_pn    : "sound",
    uiHandler : [_ui_]
  };
  
  const uname = _ui_.mget('username') || _ui_.mget('uname');

  const avatar = { 
    kind: KIND.profile,
    id:  _ui_.mget('avatar_id') || Visitor.profile().id,
    type:'thumb',
    active: 0,
    firstname: uname 
  };
    //lastname: _ui_.mget(_a.lastname) || uname || Visitor.lastname()
        
  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__avatar`,
        sys_pn    : "avatar",
        kids      : [avatar],
        attrOpt   : {
          id : "localuseravatar"
        }
      }),
        
      Skeletons.Note({
        content   : LOCALE.ME, //_ui_.mget(_a.label)
        className : `${_ui_.fig.family}__label local`
      }),

      Skeletons.Element({
        tagName: _a.video,
        className : `${_ui_.fig.family}__video local`,
        sys_pn : _a.video,
        attrOpt: { 
          autoplay : '1',
          playsinline : true,
          id : `${_ui_.mget("participant_id")}-local-video`
        }
      }),

      Skeletons.Element({
        tagName: _a.audio,
        className : `${_ui_.fig.family}__audio local`,
        sys_pn :_a.audio,
        attrOpt: { 
          autoplay : '1',
          id : `${_ui_.mget("participant_id")}-local-audio`,
          muted: true
        }
      }),

      Skeletons.Element({
        className : `${_ui_.fig.family}__video__screen local`,
        // state  : _ui_.mget(_a.video)
        // tagName: _a.video
        sys_pn :_a.screen,
        attrOpt: { 
          autoplay : true,
          id : "localpresentervideo",
          playsinline : true
        }
      }),

      sound
    ]});

  return a;
};
module.exports = __skl_stream_local;