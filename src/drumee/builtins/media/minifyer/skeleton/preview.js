// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/media/minifyer/skeleton/preview.js
//   TYPE : Skeleton
// ==================================================================== *
const _file_icon = require('../../template/map');

/**
 * @param {Letc} m 
 * @returns
 */
function __media_preview (m) {
  let chartId, html;
  switch (m.filetype) {
    case _a.image:
      chartId = "desktop_picture";
      break;
    
    case _a.folder: 
      chartId = _a.folder; 
      break;
    
    case _a.video:
      switch (m.mimetype) {
        case _a.audio:
          chartId = "desktop_musicfile";
          break;
        
        default:
          chartId = "desktop_videofile";      
      }
      break;
    
    case _a.stream: 
      chartId = 'drumee-phone-cam';
      break;
    
    case _a.music: case _a.audio:
      chartId = "desktop_musicfile";
      break;
    
    case _a.document: case _a.stylesheet: case _a.script: case _a.web: case _a.schedule:
      try { 
        chartId = _file_icon(m.ext.toLocaleLowerCase());
      } catch (e) {
        chartId = "documents_different";
      }
      break;
    
    case _a.hub:
      switch (m.area) {
        case _a.public:
          chartId = 'desktop_public';
          break;
        
        case _a.share:
          chartId = 'drumee-invitations';
          break;
        
        default: 
          chartId = 'two-users';
      }
      break;
    
    default: 
      chartId = 'desktop_docfile';
  }

  const type = m.filetype;
  const {
    area
  } = m;

  if (m.imgCapable) {
    if (type === _a.video) {
      html = `\
        <div id=\"${m._id}-preview\" class=\"full preview image-capable\" \
        style=\"background-image:url(${m.url});\"> \
        <svg id=\"${m._id}-icon\" class=\"full icon ${type} ${area}\"> \
        ${Template.Xmlns('raw-video')} \
        </svg> \
        </div>\
      `;
    } else { 
      html = `\
        <div id=\"${m._id}-preview\" class=\"full preview image-capable\" \
        style=\"background-image:url(${m.url});\"> \
        </div>\
      `;
    }
  } else { 
    html = `\
      <svg id=\"${m._id}-preview\" class=\"full icon ${type} ${area}\"> \
      ${Template.Xmlns(chartId)} \
      </svg>\
    `;
  }

  const removeMedia = `\
    <div id=\"${m._id}-remove\" data-service=\"remove-minifyer\" class=\"${m.fig.family}__remove remove\">
      <svg class=\"${m.fig.family}__remove--icon full\">
        <use xmlns:xlink=\"http://www.w3.org/1999/xlink\" xlink:href=\"#--icon-cross\"></use>
      </svg>
    </div>
  `;

  html = html + removeMedia;

  return html;
};

module.exports = __media_preview;