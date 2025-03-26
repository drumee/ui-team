// ===========================================================
// _text_editable_template
// 
// 
// ===========================================================
const _text_editable_template = function(_ui_){
  const m = _ui_.model.toJSON();
  let editable = true;
  const c = m.content || m.value || m.text || '';
  if(_ui_.mget('readwrite') && !_.isEmpty(c)) editable = false;
  const a = `<div id="${_ui_._id}" 
    class="${m.innerClass} ${_ui_.fig.family} inner note-content" 
    contenteditable="${editable}"
    placeholder="${m.placeholder}">
    ${c}
  </div>`;
  return a;
};
module.exports = _text_editable_template;