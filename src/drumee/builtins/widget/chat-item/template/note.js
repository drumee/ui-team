module.exports = function(m, content, cn) {
  return`<div class="${m.fig}__${cn} ${m.author}"><div class="note-content ${m.fig}__${cn}-content">${content}</div></div>`;
}
