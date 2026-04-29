let uiHack = localStorage.uiHack || "";

const __media_filename = function (m) {
  const filename = m.filename || LOCALE.PROCESSING;
  let service = _e.rename;

  if (![null, undefined, "", "open-node"].includes(m.service)) {
    service = m.service;
  }
  let v = '';
  if (m.imgCapable) {
    v = 'image-capable';
  }

  // File kebab → theme-aware sprite glyph, sits inline next to filename
  // in meta-row-top. Folder/workspace kebab is rendered separately inside
  // folder-art (template/folder/index.js) using a white-circles inline SVG.
  const trigger = `
    <div class="media-context-menu__trigger" data-service="context-menu">
      <svg class="media-context-menu__trigger-icon">
        <use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#--icon-bold-dot-vertical"></use>
      </svg>
    </div>`;

  const isFolder = m.filetype === _a.folder || m.filetype === _a.hub;
  const noTrigger = isFolder
    || m.isAttachment
    || Visitor.inDmz
    || (m.isalink && (m.filetype !== _a.hub))
    || m.status === _a.deleted;

  let html;
  if (isFolder) {
    // Folder / workspace label only — kebab lives inside folder-art, date is
    // not shown for folders/workspaces per Figma 264:81896 / 264:80393.
    html = `
      <div id="${m._id}-filename" class="filename ${uiHack} ${m.area} ${m.filetype} ${v}">
        ${filename}
      </div>`;
  } else {
    // File: filename + kebab inline. Date is rendered by template/index.js
    // as <span class="media-grid__date"> below meta-row-top.
    const fileTrigger = noTrigger ? "" : trigger;
    const svc = noTrigger ? "" : `data-service="${service}"`;
    html = `
      <div id="${m._id}-filename" ${svc} class="filename ${uiHack} ${m.area} ${m.filetype} ${v}">
        ${filename}
      </div>
      ${fileTrigger}`;
  }

  if (filename && (filename.length > 20)) {
    const tooltips = `<div id="${m._id}-tooltips" class="filename-tooltips ${m.area} ${m.filetype}">${filename}</div>`;
    return html + tooltips;
  }

  return html;
};

module.exports = __media_filename;
