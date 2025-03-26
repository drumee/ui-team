// ================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : /src/drumee/builtins/webrtc/screen/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_stream_remote = function(_ui_) {
  const sound = { 
    className : `${_ui_.fig.family}__sound-analyzer`,
    kind      : "sound_analyzer",
    sys_pn    : "sound",
    uiHandler : [_ui_]
  };
  const uname = _ui_.mget(_a.username);
  const id = _ui_.mget("participant_id");
  let state = 1;
  if (_.isEmpty(uname)) {
    state = 0;
  }
  const micro =  Skeletons.Button.Svg({
    className : `${_ui_.fig.family}__audio remote`,
    ico       : "micro",
    sys_pn    : "audio",
    state     : _ui_.mget(_a.audio) || _ui_.mget('muted'),
    attrOpt   : {
      id : `${id}_mic`
    }
  });
  // fullscreen =  Skeletons.Button.Svg
  //   className : "#{_ui_.fig.family}__fullscreen remote"
  //   ico       : "player-fullscreen"
  //   sys_pn    : "fullscreen"
  //   service   : "togglefullscreen"
  //   state     : 0
  //   attrOpt   :
  //     id : "#{id}-fullscreen"

  const avatar = { 
    kind: KIND.profile,
    id:  _ui_.mget(_a.uid),
    type:'thumb',
    active: 0,
    className : 'no-online-status',
    firstname: _ui_.mget(_a.firstname) || uname,
    lastname: _ui_.mget(_a.lastname) || ''
  };
  
  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__avatar`,
        sys_pn    : "avatar",
        kids      : [avatar],
        state     : _ui_.mget(_a.video),
        attrOpt   : {
          id : `${id}_avatar`
        }
      }),

      Skeletons.Element({
        tagName: _a.video,
        className : `${_ui_.fig.family}__video remote`,
        sys_pn : _a.video,
        // state  : _ui_.mget(_a.video)
        active : 1,
        dataset   : {
          presenter : _ui_.mget("isPresenter")
        },
        attrOpt: { 
          autoplay : "true",
          id : `${id}-remote-video`,
          playsinline : "true"
        }
      }),

      Skeletons.Element({
        tagName: _a.audio,
        className : `${_ui_.fig.family}__audio remote`,
        sys_pn : 'output',
        active : 0,
        attrOpt: { 
          autoplay : "true",
          id : `${id}-remote-audio`,
          playsinline : "true"
        }
      }),

      Skeletons.Note({
        sys_pn    : 'uname',
        content   : uname,
        className : `${_ui_.fig.family}__uname remote`,
        dataset   : {
          state
        }
      }), 

      Skeletons.Note({
        sys_pn    : _a.error,
        content   : '',
        className : `${_ui_.fig.family}__error remote`,
        dataset   : {
          error: 0
        }
      }), 
      sound,
      micro
      //fullscreen
    ]});
  return a;
};
module.exports = __skl_stream_remote;