// ==================================================================== *
const __chat_template_note = function(m, content, cn) {
  html = html = `<div class="${m.fig}__${cn} ${m.author}">
    <div class="note-content ${m.fig}__${cn}-content">${content}</div>
  </div>`;;

  return html;
};

module.exports = __chat_template_note;
