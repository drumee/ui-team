// ==================================================================== *
//   Copyright Xialia.com  2011-201ç
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
if (__BUILD__ === "dev") { 
  const __dbg_path = "builtins/widget/player/document/skeleton/main";
}


// ===========================================================
// __document_command
//
// @param [Object] _ui_
// @param [Object] api
//
// @return [Object] 
//
// ===========================================================
const __document_command = function(_ui_) {

  const play = SKL_SVG("desktop_playpreview", {
    className : "play-btn",
    service   : _e.play,
    sys_pn    : "button-ctrl",
    partHandler : [_ui_],
    uiHandler : [_ui_],
    state     : 0,
    toggle    : 1,
    icons     : [
      "desktop_playpreview",
      "desktop_musicpause"
    ]
    // value     : value
  }, {padding: 0, zIndex:2000});

  const a = Skeletons.Box.X({
    debug      : __filename,
    className  : `${_ui_.fig.family}__control`,
    sys_pn     : "command",
    kids : [play]});


  return a;
};
module.exports = __document_command;
