// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : 
//   TYPE : 
// ==================================================================== *

const _raw = function(_ui_, content, type) {
  let body;
  if (_.isString(content)) {
    body = Skeletons.Note({
      className : `${_ui_.fig.family}__message ${type} my-30`,
      content,
      service   : _e.close
    });
  } else { 
    body = content;
    body.sys_pn = content.sys_pn || 'body';
  }
  const a = Skeletons.Box.Y({
    className : `${_ui_.fig.family}__main u-jc-center u-ai-center`,
    debug     : __filename, 
    sys_pn : "raw-content",
    kids: [
      Preset.Button.Close(_ui_),
      body 
    ]});
  return a;
};
module.exports = _raw;
