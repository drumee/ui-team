/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/invitation/recipient/skeleton/name/removable
//   TYPE : Skelton
// ==================================================================== *


const __recipient_name_removable=function(_ui_){
  let drumate;
  let cn = 'destination';
  //@debug "qqqqaa", @, _ui_
  if (_ui_.mget(_a.id) != null) {
    ({
      drumate
    } = _a);
  } else { 
    drumate = '';
  }

  let service = _e.remove;

  if (_ui_.mget(_a.idle)) {
    cn = `${cn} idle`;
    service = 'revoke';
  }
  const a = Skeletons.Box.X({
    className : `${_ui_.fig.family}__main ${cn} ${_ui_.fig.group}__main`, // "pl-26"
    debug     : __filename,
    tooltips  : {
      offsetY : 40, 
      anchor  : _a.self,
      parent  : _ui_.parent,
      content : _ui_.tooltips,
      className : `${_ui_.fig.family}__tooltips ${_ui_.fig.group}__tooltips ${drumate}`
    },
    kids: [                
      Skeletons.Note({
        content : _ui_.name,
        className   : `${_ui_.fig.family}__label recipient-label ${cn} `
      }),
      Skeletons.Button.Svg({
        service,
        uiHandler : _ui_,
        ico       : "account_cross",
        className : `${_ui_.fig.family}__icon ${cn} recipient-icon`
      })
    ]});
  return a;
};
module.exports = __recipient_name_removable;
