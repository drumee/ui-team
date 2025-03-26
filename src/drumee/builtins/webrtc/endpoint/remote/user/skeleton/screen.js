// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/screen/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

const __remote_screen = function(_ui_) {
  const sound = { 
    className : `${_ui_.fig.family}__sound-analyzer`,
    kind      : "sound_analyzer",
    sys_pn    : "sound",
    uiHandler : [_ui_]
  };
  // uname = ""
  // if _ui_.mget('presenter')
  //   uname = _ui_.mget('presenter').mget(_a.username)
  const id = _ui_.mget("participant_id");
  // state = 1
  // if _.isEmpty(uname)
  //   state = 0
  const micro =  Skeletons.Button.Svg({
    className : `${_ui_.fig.family}__audio remote`,
    ico       : "micro",
    sys_pn    : "audio",
    state     : _ui_.mget(_a.audio),
    attrOpt   : {
      id : `${id}_mic`
    }
  });
  const fullscreen =  Skeletons.Button.Svg({
    className : `${_ui_.fig.family}__fullscreen remote`,
    ico       : "player-fullscreen",
    sys_pn    : "fullscreen",
    service   : "togglefullscreen",
    state     : 0,
    // dataset   :
    //     fullscreen : _ui_.mget("isfullscreen")
    attrOpt   : {
      id : `${id}-fullscreen`
    }
  });

  
  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main screen`,
    debug      : __filename,
    kids       : [

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


      // Skeletons.Note
      //   sys_pn    : 'presenter-name'
      //   content   : LOCALE.X_SCREEN.format(uname)
      //   className : "#{_ui_.fig.family}__presenter-name remote"
      //   dataset   :
      //     state: 0 

      fullscreen
    ]});
  return a;
};
module.exports = __remote_screen;