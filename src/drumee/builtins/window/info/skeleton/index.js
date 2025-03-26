// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __skl_window_info = function(_ui_) {
  let content;
  const mode = _ui_.mget(_a.mode) || "hbf";
  const header = Skeletons.Box.X({
    className : `${_ui_.fig.family}__header ${_ui_.fig.group}__header`, 
    kids : [require('./top-bar')(_ui_)]});

  const body = _ui_.mget(_a.body);
  if(body) {
    if (_.isFunction(body)) {
      content = body(_ui_);
    } else { 
      content = body;
    }
  } else { 
    content = require('./message')(_ui_);
  }

  const footer = Skeletons.Box.X({
    className : `${_ui_.fig.family}__footer`, 
    kids : [
      Skeletons.Note({
        className : `${_ui_.fig.family}__button`,
        content : "Ok",
        service : _e.close
      })
      ]});

  const m = new RegExp(`[${mode}]`);
    
  const a = Skeletons.Box.Y({
    className  : `${_ui_.fig.family}__main ${_ui_.fig.group}__main drive-popup`,
    radio      : _a.parent,
    debug      : __filename,
    kids       : []});

  if (m.test('h')) {
    a.kids.push(header);
  }
  if (m.test('bc')) {
    a.kids.push(content);
  }
  if (m.test('f')) {
    a.kids.push(footer);
  }
  //@debug "HHHHHHHHH", a 
  return a;
};
module.exports = __skl_window_info;
