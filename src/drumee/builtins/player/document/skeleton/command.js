
module.exports = function (_ui_) {

  const play = SKL_SVG("desktop_playpreview", {
    className: "play-btn",
    service: _e.play,
    sys_pn: "button-ctrl",
    partHandler: [_ui_],
    uiHandler: [_ui_],
    state: 0,
    toggle: 1,
    icons: [
      "desktop_playpreview",
      "desktop_musicpause"
    ]
  }, { padding: 0, zIndex: 2000 });

  return Skeletons.Box.X({
    debug: __filename,
    className: `${_ui_.fig.family}__control`,
    sys_pn: "command",
    kids: [play]
  });


};
