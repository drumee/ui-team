// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const _file_icon = require('../../template/map');


//-------------------------------------
// 
//-------------------------------------
const __m_preview=function(m, speudo_icon){
  //this.debug "AAAAAAAAAAAAAAA 16", m.filetype, m, m
  // switch m.filetype
  //   when _a.image
  //     chartId = "desktop_picture"
  //   when _a.video
  //     switch m.mimetype
  //       when _a.audio
  //         chartId = "desktop_musicfile"
  //       else
  //         chartId = "desktop_videofile"      
  //   when "music", "audio"
  //     chartId = "desktop_musicfile"
  //   when _a.document, _a.stylesheet, _a.script, _a.web, _a.schedule
  //     try 
  //       chartId = _file_icon m.ext.toLocaleLowerCase()
  //     catch e
  //       chartId = "documents_different" #"desktop_docfile"
  //       ext = m.ext
  //   when _a.hub
  //     switch m.area 
  //       when _a.public
  //         chartId = "desktop_public"
  //       else 
  //         chartId = "desktop_projectroom"
  //   when _a.error
  //       chartId = "header_question"
  //       m.imgCapable = no
          
  //   else 
  //     chartId = "desktop_docfile"
  //     ext = m.ext
  let dmz, html;
  const {ext, chartId} = require('../../template/icon-name')(m);
  const type = m.filetype || m.category;
  const {
    area
  } = m;
  if (Visitor.inDmz) {
    dmz = 'dmz';
  }
  
  switch (type) {
    case _a.image: case _a.vector:
      html = `\
<div id=\"${m._id}-preview\" class=\"preview image-capable\" \
style=\"background-image:url(${m.url});\"> \
</div>\
`;
      break;
    case _a.video:
      html = `\
<div id=\"${m._id}-preview\" class=\"preview u-jc-center u-ai-center\" \
style=\"background-image:url(${m.url});\"> \
<svg id=\"${m._id}-icon\" class=\"full icon ${type} ${area}\"> \
${Template.Xmlns('raw-video')} \
</svg> \
</div>\
`;
      break;
    case _a.folder:
      html = `\
<div id=\"${m._id}-preview\" class=\"preview ${type} ${area}\"> \
</div>\
`;
      break;
    case _a.hub:
      if (area === _a.private) {
        html = `\
<div id=\"${m._id}-preview\" class=\"preview ${type} ${area}\"> \
</div>\
`;
      } else { 
        html = `\
<div id=\"${m._id}-preview\" class=\"preview ${type} ${area}\"> \
<svg id=\"${m._id}-icon\" class=\"full icon ${type} ${area}\"> \
${Template.Xmlns(chartId)} \
</svg> \
</div>\
`;
      }
      break;

    default: 
      if(ext) {
        html = Template.SvgText(ext, `full icon extension ${type} ${dmz} ${area}`);
      } else {
        html = `\
<div id=\"${m._id}-preview\" class=\"preview ${type} ${area}\"> \
<svg id=\"${m._id}-icon\" class=\"full icon ${type} ${area}\"> \
${Template.Xmlns(chartId)} \
</svg> \
</div>\
`;
      }
  }
  return html;
};

module.exports = __m_preview;    

      // <iframe 
      //     title=\"#{m.filetype)}\"
      //     width=\"100%\"
      //     height=\"100%\"
      //     src=\"#{m.href)}\">
      // </iframe>
