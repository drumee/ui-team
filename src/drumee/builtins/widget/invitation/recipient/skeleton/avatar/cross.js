// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/invitation/recipient/skeleton/avatar/cross
//   TYPE : Skelton
// ==================================================================== *


const __recipient_avatar_removable=function(_ui_){
  const a = SKL_Box_H(_ui_, {
    className : "invite-contact",
    service   : "select-contact",
    className : `${_ui_.fig.family}__main ${_ui_.fig.group}__main`,
    debug     : __filename,
    kids: [                
      Skeletons.Note({
        className: `${_ui_.fig.family}__avatar`,
        styleOpt: {
          "background-image"   : `url(${_ui_.url})`
        }
      }),
      Skeletons.Note({
        content : _ui_.name,
        className: `${_ui_.fig.family}__label`
      }),
      // Skeletons.Button.Svg({
      //   signal    : _e.ui.event
      //   service   : _e.viev
      //   uiHandler : _ui_
      //   ico       : "desktop_preview-contacts"
      //   className : "#{_ui_.fig.family}__icon #{_ui_.fig.name}-icon view"
      // })
      Skeletons.Button.Svg({
        service   : _e.remove,
        uiHandler : _ui_,
        ico       : "cross",
        className : `${_ui_.fig.family}__icon ${_ui_.fig.name}-icon delete`
      })
    ]
  });
  return a;
};
module.exports = __recipient_avatar_removable;
