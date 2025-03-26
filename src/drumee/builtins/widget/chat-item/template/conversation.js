// ==================================================================== *

const { Autolinker } = require("autolinker");

const __chat_dod = function(m) {
  let message = Autolinker.link(m.message);
  message = message.nl2br() || ' ';
  html = `<div class="${m.fig}__conversation-content selectable-text ${m.author}">${message}</div>`;

  return html;
};

module.exports = __chat_dod;
