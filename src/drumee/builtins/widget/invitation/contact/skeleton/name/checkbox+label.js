// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/contact/skeleton/name/checkbox+label
//   TYPE : Skelton
// ==================================================================== *

const __contact_name_label=function(_ui_){
  const prefix = _ui_.fig.family;
  const a = Skeletons.Box.X({
    className : `${prefix}__main`,
    debug     : __filename,
    uiHandler     : _ui_,
    service   : "add-item",
    kids: [   
      Skeletons.Button.Svg({
        ico           : "desktop_check",
        state         : 0,
        uiHandler         : _ui_,
        labelClass    : "text",
        reference     : _a.state,
        service       : _e.select,
        className : `${_ui_.fig.family}__checkbox u-fd-row`
      }),
      Skeletons.Note({
        active    : 0,
        content   : _ui_.name,
        className : `${_ui_.fig.family}__label`
      })
    ]
  });
  return a;
};
module.exports = __contact_name_label;
