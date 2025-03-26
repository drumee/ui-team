// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : 
//   TYPE : Skelton
// ==================================================================== *

const __window_screenshare_commands = function(_ui_) {

  const c = Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__commands`,
    sys_pn    : "commands",
    kids       : [
      Skeletons.Button.Svg({
        className : "ctrl-button screen ",
        ico       : "screen_share",//"account_ip"
        sys_pn    : "ctrl-screen",
        name      : _a.screen,
        service   : _e.close,
        state     : 1
      })

    ]});
  const a = Skeletons.Box.Y({
    debug       : __filename,
    className   : `${_ui_.fig.family}__main`, 
    kids        : [ c ]});

  return a;
};

module.exports = __window_screenshare_commands;
