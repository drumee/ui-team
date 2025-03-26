// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/screen/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

const __remote_screen = function(_ui_) {
  const id = _ui_.mget("participant_id");
  const fullscreen =  Skeletons.Button.Svg({
    className : `${_ui_.fig.family}__fullscreen remote`,
    ico       : "player-fullscreen",
    sys_pn    : "fullscreen",
    service   : "togglefullscreen",
    state     : 0,
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

      fullscreen
    ]});
  return a;
};
module.exports = __remote_screen;