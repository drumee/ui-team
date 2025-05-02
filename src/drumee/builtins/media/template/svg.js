const __media_icon=function(ui, chartId, cn, bc){
  if (bc == null) { bc = "icon"; }
  const html = `<svg id="${ui._id}-${cn}" class="${bc} ${cn}"> ${Template.Xmlns(chartId)} 
</svg>`;
  return html;
};

module.exports = __media_icon;    

