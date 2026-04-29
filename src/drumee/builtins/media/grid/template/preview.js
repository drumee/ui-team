/**
 * Map filetype/extension to a Phosphor sprite name (regular weight).
 * Priority: extension > filetype > fallback.
 */
function phosphorNameFor(m) {
  const ext = (m.ext || '').toLowerCase();
  const ft = (m.filetype || '').toLowerCase();
  const extMap = {
    pdf: 'phosphor-file-pdf',
    docx: 'phosphor-file-text', doc: 'phosphor-file-text',
    xlsx: 'phosphor-table', xls: 'phosphor-table',
    pptx: 'phosphor-presentation', ppt: 'phosphor-presentation',
  };
  if (extMap[ext]) return extMap[ext];
  if (ft === 'image') return 'phosphor-image';
  if (ft === 'video') return 'phosphor-video-camera';
  if (ft === 'audio' || ft === 'music') return 'phosphor-music-note';
  if (ft === 'note' || ft === 'markdown') return 'phosphor-note-pencil';
  return 'phosphor-file';
}

const __media_preview = function (m) {
  let html;
  const { ext } = require('../../template/icon-name')(m);
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
      const phosphorName = phosphorNameFor(m);
      html = `
        <div class="preview-container ${type}">
          <svg id="${m._id}-preview" class="preview-icon ${dmz} ${type} ${area}">${Template.Xmlns(phosphorName)}</svg>
        </div>`;
    }
  }

  return html;
};

module.exports = __media_preview;

