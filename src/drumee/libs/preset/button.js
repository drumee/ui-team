/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : desk/configs/list-stream
//   TYPE : configs
// ==================================================================== *

const __desk_button = { 
  Close(_ui_, svc, cn){
    if (svc == null) { svc = _e.close; }
    return Skeletons.Button.Icon({
        ico       : "account_cross",
        className : cn || "dialog__button--close", 
        service   : svc,
        uiHandler : _ui_
      }, {
        width: 36,
        height: 36,
        padding: 12
      });
  },
  Cross(_ui_, svc, cn){
    if (svc == null) { svc = _e.close; }
    return Skeletons.Button.Svg({
        ico       : "account_cross",
        className : cn || "button__cross", 
        service   : svc,
        uiHandler : _ui_
      });
  },
  Spinner(_ui_){
    return Skeletons.Note({
      className : _C.spinner,
      uiHandler   : _ui_,
      partHandler : _ui_
    });
  }
};

module.exports = __desk_button;
