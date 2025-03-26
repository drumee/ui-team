/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/hub/admin/settings/administrator/skeleton/existing
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// __skl_administrator_main
//
// @param [Object] desk_ui
//
// @return [Object] 
//
// ===========================================================
const __skl_administrator_main = function(_ui_) {
  let edit;
  this.debug("AAAAA 16", _ui_); 
  const edit_icon = { 
    width: 26,
    height: 26,
    padding: 6
  };

  const media = _ui_.mget(_a.media);
  if ((media != null) && (media.mget(_a.privilege) &_K.permission.admin)) {
    edit = Skeletons.Button.Svg({
      ico       : "desktop_sharebox_edit",
      className : `${_ui_.fig.field}__icon ${_ui_.fig.group}__icon info`,
      uiHandler     : _ui_,
      service   : _e.edit
    }, edit_icon);
  } else { 
    edit = { kind : KIND.wrapper };
  }
  const kids = [
    Skeletons.Note({
      content: _ui_.mget(_a.label), //+ colon()
      className: `${_ui_.fig.field}__label`
    }), //dots"

    Skeletons.Box.X({
      sys_pn    : "wrapper-field",
      className : `${_ui_.fig.field}__avatar-wrapper ${_ui_.fig.name} u-ai-center`,
      kids      : _ui_.adminRoll()
    }),

    Skeletons.Box.X({
      sys_pn: "wrapper-cmd",
      className : `${_ui_.fig.family}__container-icon`,
      kids: [edit]}),

    Skeletons.Wrapper.Y({
      name : "dialog",
      className : `dialog__wrapper ${_ui_.fig.family}__dialog`
    })

  ];
  const a = Skeletons.Box.X({ 
    debug     : __filename,
    className : `${_ui_.fig.family}__main`, 
    kids
  }); 

  // a.plug(_a.debug, __filename)
  return a;
};
module.exports = __skl_administrator_main;
