// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const _file_icon = require('../../template/map');


//-------------------------------------
// 
//-------------------------------------
const __media_preview=function(media, speudo_icon){
  let chartId, html;
  const m = media.model;
  _dbg("__media_preview 16", m.get(_a.filetype), media, m);
  switch (m.get(_a.filetype)) {
    case _a.image:
      chartId = "desktop_picture";
      break;
    case _a.video:
      switch (m.get(_a.mimetype)) {
        case _a.audio:
          chartId = "desktop_musicfile";
          break;
        default:
          chartId = "desktop_videofile";      
      }
      break;
    case "music": case "audio":
      chartId = "desktop_musicfile";
      break;
    case _a.document:
      try { 
        chartId = _file_icon(m.get(_a.ext).toLocaleLowerCase());
      } catch (e) {
        chartId = "documents_different"; //"desktop_docfile"
      }
      break;
    case _a.hub:
      switch (m.get(_a.area)) { 
        case _a.public:
          chartId = "desktop_public";
          break;
        default: 
          chartId = "desktop_projectroom";
      }
      break;
    default: 
      chartId = "desktop_docfile";
  }
  const type = m.get(_a.filetype) || m.get(_a.category);
  const area = m.get(_a.area);
  switch (type) {
    case _a.image:
      html = `\
<div id=\"${media._id}-preview\" class=\"preview image-capable\" \
style=\"background-image:url(${media.url()});\"> \
</div>\
`;
      break;
    case _a.video:
      html = `\
<div id=\"${media._id}-preview\" class=\"preview u-jc-center u-ai-center\" \
style=\"background-image:url(${media.url()});\"> \
<svg id=\"${media._id}-icon\" class=\"full icon ${type} ${area}\"> \
${Template.Xmlns('raw-video')} \
</svg> \
</div>\
`;
      break;
    case _a.folder:
      html = `\
<div id=\"${media._id}-preview\" class=\"preview ${type} ${area}\"> \
</div>\
`;
      break;
    case _a.hub:
      if (area === _a.private) {
        html = `\
<div id=\"${media._id}-preview\" class=\"preview ${type} ${area}\"> \
</div>\
`;
      } else { 
        html = `\
<div id=\"${media._id}-preview\" class=\"preview ${type} ${area}\"> \
<svg id=\"${media._id}-icon\" class=\"full icon ${type} ${area}\"> \
${Template.Xmlns(chartId)} \
</svg> \
</div>\
`;
      }
      break;

    default: 
      html = `\
<div id=\"${media._id}-preview\" class=\"preview ${type} ${area}\"> \
<svg id=\"${media._id}-icon\" class=\"full icon ${type} ${area}\"> \
${Template.Xmlns(chartId)} \
</svg> \
</div>\
`;
  }
  return html;
};

module.exports = __media_preview;    

      // <iframe 
      //     title=\"#{m.get(_a.filetype)}\"
      //     width=\"100%\"
      //     height=\"100%\"
      //     src=\"#{m.get(_a.href)}\">
      // </iframe>
