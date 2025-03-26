// ================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : /src/drumee/builtins/webrtc/screen/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_player_video_content = (_ui_, source) => {
  const a = Skeletons.Element({
    tagName: _a.video,
    className : `${_ui_.fig.family}__video op-player__media`,
    sys_pn    : _a.video,
    attribute: { 
      id : "video-" + _ui_.mget(_a.widgetId),
      controls : "",
      playsinline: ""
    }
  });


  return a;
};

module.exports = __skl_player_video_content;
