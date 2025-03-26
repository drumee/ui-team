// ==================================================================== *
//   Copyright Xialia.com  2011-2020
//   FILE : 
//   TYPE : Skelton
// ==================================================================== *
    // this.__ctrlAudio.el.dataset.disabled  = 0;
    // this.__ctrlVideo.el.dataset.disabled  = 0;
    // this.__ctrlScreen.el.dataset.disabled = 0;


const __window_connect_commands = function(_ui_) {
  let audioIcon = "micro";
  let muted = 1;
  if(_ui_.caller) {
     audioIcon = "telephone_handset";
     muted = 0;
   }
  const a = Skeletons.Box.X({
    className : `${_ui_.fig.family}__commands-container`,
    debug     : __filename,
    sys_pn    : "commands",
    state     : 1,
    kids : [
      Skeletons.Box.X({
        className : `${_ui_.fig.family}__commands`,
        kids : [
            
          // Skeletons.Button.Svg
          //   className : "ctrl-button accept"
          //   ico       : _a.video #"video-camera"
          //   state     : _ui_.mget(_a.video)
          //   sys_pn    : "ctrl-video"
          //   name      : _a.video
          //   service   : _a.settings
          //   dataset   :
          //     muted : muted

          Skeletons.Button.Svg({
            className : "ctrl-button accept",
            ico       : audioIcon, //"telephone_handset" #"micro" 
            state     : _ui_.mget(_a.audio),
            sys_pn    : "ctrl-audio",
            name      : _a.audio,
            service   : _a.settings,
            dataset   : {
              muted
            }
          }),

          Skeletons.Button.Svg({
            className : "ctrl-button line",
            ico       : "telephone_handset",
            sys_pn    : "ctrl-line",
            service   : _e.close
          })
        ]})
    ]});

  return a;
};
module.exports = __window_connect_commands;
