// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : builtins/admin/skeleton/locale/row-_ui_
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_locale_language
//
// @param [Object] ext
//
// ===========================================================
const __skl_locale_language = function(_ui_) { 

  //icon = ext.icon || "common_placeholder"
  const name = '';
  const pfx = _ui_.fig.family;

  const menu = Skeletons.Box.X({
    className: `${pfx}__header`,
    service : _a.toggle,
    name: "header",
    kids:[
      Skeletons.Note({
        className: `${pfx}__key`,
        value: _ui_.mget('key_code'),
        name: "key_code",
        active : 0
      })
      // Skeletons.Button.Svg({
      //   ico:"editbox_pencil", 
      //   className: "#{pfx}__icon"
      //   bubble   : 1
      //   signal: _e.ui.event
      //   service : "edit-row"
      //   data    : ext
      //   uiHandler : _ui_.getHandlers(_a.ui)
      // }, action_icon_options)
      // Skeletons.Button.Svg({
      //   ico:"desktop_delete", 
      //   className : "#{pfx}__icon"
      //   service   : "delete-key"
      //   name      : ext.key_code
      //   id        : ext.id 
      // })
    ]
  });
  const content = Skeletons.Box.Y({
    className: `${pfx}__container`,
    sys_pn: _a.content
  });

  // a = Skeletons.Box.Y({
  //   className: "#{pfx}__main"
  //   initialState: 0
  //   kids:[menu, content]
  // })
  return [menu, content];
};
module.exports = __skl_locale_language;
