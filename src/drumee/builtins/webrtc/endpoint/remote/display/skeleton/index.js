// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/screen/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

const __remote_screen = function(_ui_) {
  const id = _ui_.mget("participant_id");
  // Who is sharing. `label` is resolved in the widget's initialize() from the
  // firstname / fullname / username it was fed; the room supplies that from the
  // presenter's participant tile, or from Visitor for our own screen. Rendered
  // as the same bottom-left name pill the participant tiles use, and hidden via
  // data-state when we have no name — mirrors endpoint/remote/user/skeleton.
  const uname = _ui_.mget(_a.label);
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

      // Spinner shown while the shared screen is loading (from the display
      // appearing until the desktop video's first frame — onloadeddata hides
      // it). Covers the black gap for viewers, notably late joiners.
      Skeletons.Box.Y({
        className : `${_ui_.fig.family}__loading`,
        sys_pn    : "screen-loading"
      }),

      Skeletons.Note({
        className : `${_ui_.fig.family}__uname`,
        content   : uname,
        dataset   : {
          state : _.isEmpty(uname) ? 0 : 1
        }
      }),

      fullscreen
    ]});
  return a;
};
module.exports = __remote_screen;