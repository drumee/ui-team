/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/counter/project/skeleton/main
//   TYPE : Skelton
// ==================================================================== *

// ===========================================================
// __window_warning
//
// @param [Object] _ui_
//
// @return [Object] 
//
// ===========================================================
const __window_warning = function(_ui_, content, service, buttonStyle) {
  let body;
  if (service == null) { service = "close-dialog"; }
  if (buttonStyle == null) { buttonStyle = ""; }
  const prefix = "warning";
  if (_.isEmpty(content)) {
    return '';
  }
    
  if (_.isString(content)) {
    body = [
      Skeletons.Box.Y({
        className : `${_ui_.fig.group}-${prefix}__body`,
        sys_pn    : _a.body,
        uiHandler     : _ui_,
        kids:[
          Skeletons.Note({
            className : `${_ui_.fig.group}-${prefix}__content`,
            content
          }),
          Skeletons.Box.X({
            className: `${_ui_.fig.group}-${prefix}__commands`,
            kids: [
              Skeletons.Note({
                content   : "Ok",
                uiHandler : _ui_,
                service,
                className : `${_ui_.fig.group}-${prefix}__button ${buttonStyle}`
              })
            ]
          })
        ]
      })
    ];
  } else { 
    body = content;
    if (!_.isArray(body)) {
      body = [content];
    }
  }
  //@debug "ZEZEZEZEZE", body 
  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.group}-${prefix}__main`,
    uiHandler : _ui_,
    debug : __filename,
    kids: [
      // Preset.Button.Close(_ui_, "close-dialog")
      Skeletons.Box.Y({
        uiHandler : _ui_,
        area    : _a.private,
        className  : `${_ui_.fig.group}-${prefix}__container`,
        kids  : body
      })
    ]
  });
  return a;
};
module.exports = __window_warning;
