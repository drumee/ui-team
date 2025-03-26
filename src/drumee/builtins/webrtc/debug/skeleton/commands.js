const { toggleState } = require("core/utils")
const __webrtc_commands = function(_ui_) {

  const figname = "commands";

  const a = Skeletons.Box.X({
    debug     : __filename,
    className : `${_ui_.fig.family}__${figname}`,
    kidsOpt   : {
      className : "ctrl-button"
    },
    kids       : [
      Skeletons.Button.Svg({
        ico       : "micro",
        state     : 1,
        service   : _a.audio
      }),

      Skeletons.Button.Svg({
        ico       : "video-camera",
        service   : _a.video,
        state     : toggleState(_ui_.mget(_a.video))
      }),

      Skeletons.Button.Svg({
        ico       : "speaker",
        service   : "speaker",
        state     : 1
      }),

      Skeletons.Button.Svg({
        className : "online",
        ico       : "desk-phone",
        service   : _e.close,
        dataset   : {
          online  : 1
        }
      })
    ]});
  
  return a;
};
module.exports = __webrtc_commands;
