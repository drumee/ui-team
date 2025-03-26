// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

const __m_preview = function (m, speudo_icon) {
  let dmz, html;
  const { ext, chartId } = require('../../template/icon-name')(m);
  const type = m.filetype || m.category;
  const {
    area
  } = m;
  if (Visitor.inDmz) {
    dmz = 'dmz';
  }

  switch (type) {
    case _a.image:
    case _a.vector:
      html = `
        <div id="${m._id}-preview" class="preview image-capable" 
        style="background-image:url(${m.url});"></div>`;
      break;
    // case _a.vector:
    //   html = `
    //       <div id="${m._id}-preview" class="full preview image-capable" style="background-image:url(${m.url});"> 
    //       <svg id="${m._id}-icon" class="full icon ${type} ${dmz} ${area}">${m.svgText}</svg> 
    //     </div>`;
    //   break;
    case _a.video:
      html = `
        <div id="${m._id}-preview" class="preview u-jc-center u-ai-center" style="background-image:url(${m.url});"> 
          <svg id="${m._id}-icon" class="full icon ${type} ${area}">${Template.Xmlns('raw-video')}</svg> 
        </div>`;
      break;
    case _a.folder:
      html = `<div id="${m._id}-preview" class="preview ${type} ${area}"></div>`;
      break;
    case _a.hub:
      if (area === _a.private) {
        html = `
        <div id="${m._id}-preview" class="preview ${type} ${area}"></div>`;
      } else {
        html = `
          <div id="${m._id}-preview" class="preview ${type} ${area}"> 
          <svg id="${m._id}-icon" class="full icon ${type} ${area}">${Template.Xmlns(chartId)}</svg> 
          </div>`;
      }
      break;

    default:
      if (ext) {
        html = Template.SvgText(ext, `full icon extension ${type} ${dmz} ${area}`);
      } else {
        html = `
          <div id="${m._id}-preview" class="preview ${type} ${area}"> 
            <svg id="${m._id}-icon" class="full icon ${type} ${area}">${Template.Xmlns(chartId)}</svg> 
          </div>`;
      }
  }
  return html;
};

module.exports = __m_preview;    
