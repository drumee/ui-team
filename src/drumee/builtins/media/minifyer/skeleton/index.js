// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/media/minifyer/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_media_minifyer (_ui_) {

  const m = _ui_.model.toJSON();
  m.imgCapable = _ui_.imgCapable();
  m.url = _ui_.url();
  m._id = _ui_._id;
  m.fig = _ui_.fig;

  const preview  = require('./preview')(m);
  const filename = require('./filename').default(m);
  let html = preview + filename;
  
  return `<div class=\"full media-minifyer__content ${m.type}\">${html}</div>`;
};

module.exports = __skl_media_minifyer;
