const __media_tpl_row=function(_ui_){

  const m = _ui_.model.toJSON();
  m.imgCapable = _ui_.imgCapable();
  m._id = _ui_._id;
  m.fig = _ui_.fig;

  const checkbox  = require('../../template/checkbox')(m);
  let preview  = require('./preview')(m);
  const protect = '';

  const filename = require('./filename')(m);
    const details = require('./details')(m);
  const notify = require('../../template/notify')(m);
  const name = `<div class=\"box ${m.fig.family}__field-filename\" data-flow=\"x\"> ${filename} </div>`;
  preview = `<div class=\"box ${m.fig.family}__field-preview\" data-flow=\"x\"> ${preview + protect + notify} </div>`;
  let html = checkbox + preview + name + details;

  if (m.isalink && (m.filetype !== _a.hub)) {
    html = html + require('../../template/shortcut')(m);
  }

  return `<div class=\"box ${m.fig.family}__main\" data-flow=\"g\">${html}</div>`;
};

module.exports = __media_tpl_row;    
