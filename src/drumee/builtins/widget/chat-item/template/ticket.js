// ==================================================================== *

const { Autolinker } = require("autolinker");
const __chat_template_ticket = function(m) {

  let msg = `#${m.ticket_id}`;
  let md = m.metadata;
  let category;
  if(_.isArray(md.category) && md.category.length){
    category = md.category.join(', ');
    msg = msg + `<br> ${md.category_display.join(', ')}`;

  }

  if(_.isArray(md.where) && md.where.length){
    category = md.where.join(', ')
    msg = msg + `<br> ${md.where_display.join(', ')}`
  }
    
  if (md.alltime){
    msg = msg + "<br> All the time"

  }

  msg = msg + "<br>" + Autolinker.link(m.message);


  msg = msg.nl2br() || ' ';
  html = `<div class="${m.fig}__conversation selectable-text ${m.author}">${msg}</div>`;

  return html;
};

module.exports = __chat_template_ticket;
