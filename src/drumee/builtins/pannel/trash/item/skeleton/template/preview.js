const __media_preview = function (m) {
  let html;
  const { ext, chartId } = require('./icon-name')(m);
  const type = m.filetype;

  if (ext) {
    html = Template.SvgText(ext, `full extension ${type}`);
  } else {
    html = `
      <div class="full ${type}">
        <svg id="${m._id}-preview" class="preview-icon ${type}">${Template.Xmlns(chartId)}</svg>
      </div>`;
  }

  return html;
}

module.exports = __media_preview;

