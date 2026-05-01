
module.exports = function (ui) {

  let html = '';
  const m = ui.model.toJSON();
  m.fig = ui.fig.family;
  let body;
  let avatar = require('./avatar')(m);

  if (m.message_type == _a.call) {
    body = require('./call-stat')(m)
  } else {
    body = require('./conversation')(m);
    if (m.author != _a.me && m.type == _a.share) {
      let uname = require('./username')(m);
      body = `${uname}${body}`;
    }
  }
  const footer = require('./footer')(m);
  let content = `<div id="content-${m.widgetId}" class="${m.fig}__message-content ${m.author}">${body}${footer}</div>`;
  html = `${avatar}${content}`;
  return html;
};
