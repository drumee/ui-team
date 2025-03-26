const __player_image_play = _ui_ => Skeletons.Button.Svg({
    ico       : "desktop_musicplay",
    className : "icon play",
    service   : _a.play,
    uiHandler : _ui_,
    sys_pn    : 'ctrl-play'
  });
  
module.exports = __player_image_play;
