const __media_icon=function(m, chartId, service){
  if (service == null) { service = ""; }
  const html = `\
<svg id=\"${m._id}-icon\" data-service=\"${service}\" \
class=\"full icon ${m.filetype} ${m.area}\"> \
${Template.Xmlns(chartId)} \
</svg>\
`;

  return html;
};

module.exports = __media_icon;    

