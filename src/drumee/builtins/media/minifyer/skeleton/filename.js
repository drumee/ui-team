// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/media/minifyer/skeleton/filename.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_media_minifyer_filename (m) {
  let filename = m.filename || LOCALE.PROCESSING;

  if (m.filetype == _a.audio) {
    filename = LOCALE.MUSIC_PLAYER;
  }

  let v = '';
  if (m.imgCapable) {
    v = 'image-capable';
  }

  let html = `\
    <div id=\"${m._id}-filename\" class=\"filename ${m.area} ${m.type} ${v}\"> \
    ${filename} \
    </div>\
    `;

  if (filename && (filename.length > 24)) {
    const tooltips = `<div id=\"${m._id}-tooltips\" class=\"filename-tooltips  ${m.area} ${m.type}\">${filename}</div>`;  
    return html + tooltips;
  }
  
  return html;
};

export default __skl_media_minifyer_filename;
