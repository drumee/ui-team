// ===========================================================
// _text_template
// 
// 
// ===========================================================
const _text_template = function(_ui_, m, content){
  const id = _ui_.attribute.get(_a.id) || _ui_._id;
  const a = `\
<div id=\"${id}-inner\" class=\"${m.innerClass} ${_ui_.fig.family} inner note-content\"> \
${c} \
</div>\
`;
  return a;
};
module.exports = _text_template;