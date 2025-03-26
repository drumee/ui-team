const _svg_template = function(_ui_){
  const m = _ui_.model.toJSON();
  const a = `\
<svg id=\"icon-${m.widgetId}\" \
class=\"full inner drumee-picto ${m.innerClass}\" > \
<use xmlns:xlink=\"http://www.w3.org/1999/xlink\" \
xlink:href=\"#--icon-${m.chartId}\"> \
</use> \
</svg>\
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
