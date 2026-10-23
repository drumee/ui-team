const { chipGlyph } = require('libs/file-meta');
const folderArt = require('media/grid/template/folder');

const __media_tpl_row=function(_ui_){

  const m = _ui_.model.toJSON();
  m.imgCapable = _ui_.imgCapable();
  m._id = _ui_._id;
  m.fig = _ui_.fig;

  const checkbox  = require('../../template/checkbox')(m);
  let preview  = require('./preview')(m);
  const protect = '';

  const isHub = m.filetype === _a.hub;
  // A thumbnail stays a thumbnail: images, vectors and videos (vignette,
  // painted by the row's enablePreview), and documents with a server poster
  // (preview.js's imgCapable branch).
  const hasThumbnail =
    m.filetype === _a.image ||
    m.filetype === _a.vector ||
    m.filetype === _a.video ||
    !!m.imgCapable;

  if (m.filetype === _a.folder || isHub) {
    // Folders and workspaces: the breadcrumb's folder art
    // (desk/breadcrumb/item, .breadcrumb-item__icon) — the area-tinted shape
    // from media/grid/template/folder, plus the area badge on a workspace.
    // NOT the old `.folder.preview` / `.hub.preview` CSS box: those classes
    // stay off so its painted rectangle does not sit behind the art.
    // isAttachment: no kebab on a 20px glyph; the row has its own menu.
    preview =
      `<div id="${m._id}-preview" class="preview folder-art ${m.area || ''}">` +
        folderArt({
          area: m.area,
          filetype: isHub ? _a.hub : _a.folder,
          role: isHub ? 'desk' : '',
          widgetId: `row-${m._id}`,
          isAttachment: 1,
        }) +
      `</div>`;
  } else if (!hasThumbnail) {
    // Every other file: its file-TYPE glyph — the same icon set as the chat
    // composer's attachment chips and the tasks panel's comment chips
    // (libs/file-meta chipGlyph): Word/Excel/PowerPoint in their own colours,
    // audio, text, and the generic file icon for the rest. data-ext, as on the
    // chip: the skin singles out the office icons, whose page body has no fill
    // of its own.
    const ext = String(m.extension || m.ext || '').toLowerCase();
    preview =
      `<div id="${m._id}-preview" class="preview chip-glyph ${m.filetype || ''}">` +
        `<svg class="preview-icon ${m.filetype || ''}" data-ext="${ext}">` +
          Template.Xmlns(chipGlyph(m)) +
        `</svg>` +
      `</div>`;
  }

  const filename = require('./filename')(m);
    const details = require('./details')(m);
  const notify = require('../../template/notify')(m);
  const name = `<div class="box ${m.fig.family}__field-filename" data-flow="x"> ${filename} </div>`;
  preview = `<div class="box ${m.fig.family}__field-preview" data-flow="x"> ${preview + protect + notify} </div>`;
  let html = checkbox + preview + name + details;

  if (m.isalink && (m.filetype !== _a.hub)) {
    html = html + require('../../template/shortcut')(m);
  }

  return `<div class="box ${m.fig.family}__main" data-flow="g">${html}</div>`;
};

module.exports = __media_tpl_row;
