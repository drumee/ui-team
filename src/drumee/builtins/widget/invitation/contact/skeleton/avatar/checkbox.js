// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/contact/item/skeleton/main.coffee
//   TYPE : Skelton
// ==================================================================== *

const __contact_avatar_cb=function(_ui_){
  const prefix = _ui_.fig.family;
  const a = Skeletons.Box.X({
    className : `${prefix}__main`,
    debug     : __filename,
    uiHandler     : _ui_,
    service   : "add-item",
    kids: [   
      Skeletons.Note({
        className: `${_ui_.fig.family}__avatar`,
        styleOpt: {
          "background-image"   : `url(${_ui_.url})`
        }
      }),
      Skeletons.Note({
        active    : 0,
        content   : _ui_.name,
        className : `${_ui_.fig.family}__label`
      }),
      Skeletons.Button.Svg({
        ico           : "desktop_check",
        state         : 0,
        uiHandler         : _ui_,
        labelClass    : "text",
        reference     : _a.state,
        service       : _e.select,
        className : `${_ui_.fig.family}__checkbox u-fd-row`
      })
    ]
  });
  return a;
};
module.exports = __contact_avatar_cb;
