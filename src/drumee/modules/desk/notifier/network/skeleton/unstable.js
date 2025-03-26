// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : src/drumee/builtins/desk/skeleton/top-bar/main
//   TYPE : 
// ==================================================================== *

const __notifier_network_unstable = function(_ui_) {
  const a = Skeletons.Box.X({
    debug     : `${__filename}`,
    className : `${_ui_.fig.family}__main unstable`,
    kids      : [
      Skeletons.Button.Svg({
        ico       : "raw-circular-arrows",
        className : `${_ui_.fig.family}__icon unstable`,
        active    : 0
      }),

      Skeletons.Note({
        className  : `${_ui_.fig.family}__text unstable`,
        content    : LOCALE.UNSTABLE_CONNECTION
      }),

//--icon-account_cross

      Skeletons.Button.Svg({
        ico       : "account_cross",
        className : `${_ui_.fig.family}__icon close`,
        service   : _e.close,
        uiHandler : [_ui_]})
      // Preset.Button.Close(_ui_, "#{_ui_.fig.family}__icon close")
    ]
  });  
  return a;
};

module.exports = __notifier_network_unstable;
