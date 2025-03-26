const _svg_template = function(_ui_){
  const m = _ui_.model.toJSON();
  const a = `\
<img id=\"icon-${m.widgetId}\" src=\"${m.src}\" \
class=\"full inner drumee-picto ${m.innerClass}\" > \
</img>\
`;
  if (!_.isEmpty(m.label)) {
    const l = `\
<span id=\"label-${m.widgetId}\" class=\"${m.labelClass} note-content\" > \
<section class=\"${m.labelClass} root-node\">${m.label}</section> \
</span>\
`;
    if (m.labelFirst) { 
      return l+a;
    }
    return a+l;
  }
  return a;  
};

module.exports = _svg_template;
