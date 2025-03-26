/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/popup
//   TYPE : 
// ==================================================================== *

// ==================== *
//
// ==================== *

// ===========================================================
// _parse
//
// @param [Object] arg
// @param [Object] status
//
// @return [Object] 
//
// ===========================================================
const _parse = (arg, status) => {
  let _status_;
  if (status == null) { status = _a.error; }
  _dbg(`_parse *${arg}*`, arg, status);
  if (_.isString(arg)) {
    return {content:LOCALE[arg], className:status};
  }
  if ((arg == null)) {
    arg =
      (_status_ = _a.error);
  }
  let msg = _LOCALE(_I.UNREFERENCED_MSG);
  if (!_.isObject(arg)) {
    ({content:msg, className:status});
  }
  if (arg._status_ != null) {
    status = arg._status_;
  } else if (arg.responseJSON != null) {
    status = arg.responseJSON['_status_'];
  } else {
    ({
      status
    } = arg);
  }
  status = status;
  switch (status) {
    case _a.error:
      msg = arg.responseJSON.message || arg.responseJSON.content || msg;
      break;
    case _a.info:
      msg = arg.responseJSON.message || arg.responseJSON.content || msg;
      break;
    case _a.content: case _a.message:
      status = _a.info;
      msg = arg.content || msg;
      break;
    default:
      status = _a.error;
      if ((arg.responseText != null ? arg.responseText.match(/^<!DOC/) : undefined)) {
        msg = _LOCALE(_I.ERROR_SERVER);
      } else {
        msg = arg.responseXHR || arg.statusText || msg;
      }
  }
  _dbg("_parsed", {content:msg, className:status});
  return {content:msg, className:status};
};
// ==================== *
//
// ==================== *

// ===========================================================
// __skl_popup
//
// @param [Object] xhr
// @param [Object] status
// @param [Object] opt
//
// @return [Object] 
//
// ===========================================================
const __skl_popup = function(xhr, status, opt) {
  _dbg("__modal_skeleton", xhr, status, opt, _parse(xhr, status));
  const model = new Backbone.Model();
  try {
    model.set(_parse(xhr, status));
  } catch (error) {
    model.set({
      content : _LOCALE(_I.UNKNOWN_ERROR),
      className : _a.error
    });
  }
  if (opt != null) {
    return opt(model);
  }
  return require('skeleton/form/popup')(model);
};
module.exports = __skl_popup;