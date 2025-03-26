// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : 
//   TYPE : Skelton
// ==================================================================== *

function __webrtc_device(_ui_) {

  return Skeletons.Box.X({
    className: `device-button`,
    kids: [
      Skeletons.Button.Svg({
        className: "ctrl-button accept",
        ico: "micro", //"micro" 
        state: _ui_.mget(_a.audio),
        sys_pn: "ctrl-audio",
        name: _a.audio,
        service: _a.settings,
        dataset: {
          muted: 1
        }
      }),
      // settings_menu
      Skeletons.Button.Svg({
        className : "ctrl-button settings audio",
        ico       : "settings",
        sys_pn    : "ctrl-devicesetting",
        name      : _a.devicesettings,
        service   : 'device-setting'
      }),
      Skeletons.Wrapper.Y({
        className : `${_ui_.fig.family}__devices-list audio`,
        sys_pn: "audio-devices",
        partHandler: [_ui_],
      }),
    ]
  })
}


const __window_connect_commands = function (_ui_) {
  // audioIcon = "micro"
  // if(_ui_.state = 'ring')
  //   audioIcon = "telephone_handset"
  const a = Skeletons.Box.X({
    className: `${_ui_.fig.family}__commands-container`,
    debug: __filename,
    sys_pn: "commands",
    state: 0,
    kids: [
      Skeletons.Box.X({
        className: `${_ui_.fig.family}__commands`,
        kids: [
          Skeletons.Button.Svg({
            className: "ctrl-button screen ",
            ico: "screen_share",//"account_ip"
            sys_pn: "ctrl-screen",
            name: _a.screen,
            service: 'start-screenshare',
            state: 0,
            dataset: {
              muted: 1
            }
          }),
          Skeletons.Button.Svg({
            className: "ctrl-button accept",
            ico: "video",
            state: _ui_.mget(_a.video),
            sys_pn: "ctrl-video",
            name: _a.video,
            service: _a.settings,
            dataset: {
              muted: 1
            }
          }),

          __webrtc_device(_ui_),

          Skeletons.Button.Svg({
            className: "ctrl-button line",
            ico: "telephone_handset",
            sys_pn: "ctrl-line",
            service: _e.close
          })
        ]
      })
    ]
  });

  return a;
};
module.exports = __window_connect_commands;
