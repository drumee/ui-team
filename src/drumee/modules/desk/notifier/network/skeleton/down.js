// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/builtins/desk/skeleton/top-bar/main
//   TYPE : 
// ==================================================================== *

const __notifier_network_down = function(_ui_) {
  const a = Skeletons.Box.X({
    debug     : `${__filename}`,
    className : `${_ui_.fig.family}__main down`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : "raw-unplug",
        className : `${_ui_.fig.family}__icon down`,
        active    : 0
      }),

      Skeletons.Note({
        className  : `${_ui_.fig.family}__text down`,
        content    : LOCALE.CONNECTION_LOST,
        active    : 0
      })

      //Preset.Button.Close(_ui_, "#{_ui_.fig.family}__icon close")
    ]
  });  
  return a;
};

module.exports = __notifier_network_down;
