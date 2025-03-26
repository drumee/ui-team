// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/contact/item/skeleton/name-only
//   TYPE : Skelton
// ==================================================================== *

const __contact_name_view_cross=function(_ui_){
  const prefix = _ui_.fig.family;
  const a = Skeletons.Box.X({
    className : `${prefix}__main`,
    uiHandler     : _ui_,
    service   : "select-contact",
    debug     : __filename,
    kids: [   
       Skeletons.Note({
         active  : 0,
         content : _ui_.name,
         className: `${prefix}__container`
      }),
      Skeletons.Button.Icon({
        signal    : _e.ui.event,
        service   : _e.view,
        uiHandler     : _ui_,
        ico       : "desktop_preview-contacts"
      }, {
        width: 30,
        height: 30,
        padding: 7
      }),
      Skeletons.Button.Icon({
        signal    : _e.ui.event,
        service   : _e.view,
        uiHandler     : _ui_,
        ico       : "cross"
      }, {
        width: 30,
        height: 30,
        padding: 7
      })
    ]
  });
  return a;
};
module.exports = __contact_name_view_cross;
