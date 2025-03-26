// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
//_file_icon = require('../../template/map')


//-------------------------------------
// 
//-------------------------------------
const __media_preview = function (m) {
  let html;
  const { ext, chartId } = require('../../template/icon-name')(m);
  const type = m.filetype;
  const { area } = m;
  let dmz = '';
  if (Visitor.inDmz) {
    dmz = 'dmz';
  }

  if (m.imgCapable) {
    switch (type) {
      case _a.video:
        html = `
          <div id="${m._id}-preview" class="full preview image-capable" style="background-image:url(${m.url});"> 
            <svg id="${m._id}-icon" class="full icon ${type} ${dmz} ${area}"> 
            ${Template.Xmlns('raw-video')} 
            </svg> 
          </div>`;
        break;
      // case _a.vector:
      //   html = `
      //     <div id="${m._id}-preview" class="full preview image-capable" style="background-image:url(${m.url});"> 
      //     <svg id="${m._id}-icon" class="full icon ${type} ${dmz} ${area}">${m.svgText}</svg> 
      //   </div>`;
      //   break;
      default:
        html = `<div id="${m._id}-preview" class="full preview image-capable" style="background-image:url(${m.url});"></div>`;
    }
  } else {
    if (ext) {
      html = Template.SvgText(ext, `full icon extension ${type} ${dmz} ${area}`);
    } else {
      html = `<svg id="${m._id}-preview" class="full icon ${dmz} ${type} ${area}">${Template.Xmlns(chartId)}</svg>`;
    }
  }

  return html;
};

module.exports = __media_preview;

