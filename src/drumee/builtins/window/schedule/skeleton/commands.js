// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : 
//   TYPE : Skelton
// ==================================================================== *

const __window_webinar_commands = function(_ui_) {

  const a = Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__commands`,
    sys_pn    : "commands",
    kids       : [
      Skeletons.Button.Svg({
        className : "ctrl-button screen ",
        ico       : "screen_share",//"account_ip"
        sys_pn    : "ctrl-screen",
        name      : _a.screen,
        service   : 'start-screenshare',
        state     : 0
      }),

      Skeletons.Button.Svg({
        className : "ctrl-button accept",
        ico       : "video",//"video-camera"
        state     : _ui_.mget(_a.video),
        sys_pn    : "ctrl-video",
        name      : _a.video,
        service   : _e.settings,
        state     : _ui_.mget(_a.video)
      }),

      Skeletons.Button.Svg({
        className : "ctrl-button accept",
        ico       : "micro", //"desk-phone"
        state     : _ui_.mget(_a.audio),
        sys_pn    : "ctrl-audio",
        name      : _a.audio,
        service   : _e.settings
      }),

      Skeletons.Button.Svg({
        className : "ctrl-button line",
        ico       : "drumee_teamroom_exit",
        sys_pn    : "ctrl-line",
        service   : _e.close
      })
    ]});
  
  return a;
};
module.exports = __window_webinar_commands;
