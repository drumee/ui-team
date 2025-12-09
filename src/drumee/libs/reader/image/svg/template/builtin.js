const _svg_template = function(ui){
  const m = ui.model.toJSON();
  const a = `
   <div class="${ui.fig.family}__container">
    <div id="icon-${m.widgetId}" class="full inner drumee-picto ${m.innerClass}"></div>
  </div>
  `;
  if (!_.isEmpty(m.label)) {
    const l = `
      <span id="label-${m.widgetId}" class="${m.labelClass} note-content" > 
        <section class="${m.labelClass} root-node">${m.label}</section> 
      </span>
    `;
    if (m.labelFirst) { 
      return l+a;
    }
    return a+l;
  }
  return a;  
};

module.exports = _svg_template;
