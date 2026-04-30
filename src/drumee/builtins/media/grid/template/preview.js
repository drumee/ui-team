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
          <div class="preview-container ${type}">
            <div id="${m._id}-preview" class="preview-content ${type}" style="background-image:url(${m.url});"> 
              <svg id="${m._id}-icon" class="preview-icon ${type} ${dmz} ${area}"> 
              ${Template.Xmlns('raw-video')} 
              </svg> 
            </div>
          </div>`;
        break;
      default:
        html = `
          <div class="preview-container ${type}">
            <div id="${m._id}-preview" class="preview-content ${type}" style="background-image:url(${m.url});"></div>
          </div>`;
    }
  } else {
    if (ext) {
      html = Template.SvgText(ext, `preview-icon extension ${type} ${dmz} ${area}`);
    } else {
      html = `
        <div class="preview-container ${type}">
          <svg id="${m._id}-preview" class="preview-icon ${dmz} ${type} ${area}">${Template.Xmlns(chartId)}</svg>
        </div>`;
    }
  }

  return html;
};

module.exports = __media_preview;

