/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

//-------------------------------------
// 
//-------------------------------------
const __chat_item_template = function (_ui_) {

  let html = '';
  const m = _ui_.model.toJSON();
  //m.widgetId = _ui_._id;
  m.fig = _ui_.fig.family;
  //console.log("AAA:21", m);
  let avatar = '';
  let body;

  if (m.is_ticket) {
    body = require('./ticket')(m)
  } else {
    if (m.message_type == _a.call) {
      body = require('./call-stat')(m)
    } else {
      body = require('./conversation')(m);
      if (m.type == _a.share && m.author != _a.me) {
        let uname = require('./username')(m);
        body = `${uname}${body}`;
        // avatar = require('./avatar')(m);
      }
    }
  }
  const footer = require('./footer')(m);
  let content = `<div data-type="${m.type}" id="content-${m.widgetId}" class="${m.fig}__message-content ${m.author}">${body} ${footer}</div>`
  html = `${content}`;
  return html;
};


module.exports = __chat_item_template;    
