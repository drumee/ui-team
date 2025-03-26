/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/media/icon
//   TYPE : 
// ==================================================================== *

// -------------------------------------
//
// -------------------------------------

// ===========================================================
// _get_icon_grid
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const _get_icon_grid = function(view) {
    let icon;
    if (view.model != null) {
      icon = view.model.attributes;
    } else {
      icon = view.attributes;
    }
    const ftype = view.get(_a.filetype);
    switch (ftype) {
      case _a.image:
        icon.kind      = KIND.wrapper;
        icon.className = _a.widget;
        icon.template  = '#--media-ui-image-grid';
        icon.url       = require('options/url/file')(view, _a.vignette);
        break;
      case _a.video:
        icon.kind      = KIND.wrapper;
        icon.className = _a.widget;
        icon.template  = '#--media-ui-video-grid';
        icon.flow      = _a.horizontal;
        icon.src       = require('options/url/file')(view, _a.video) + '.mp4';
        icon.img       = require('options/url/file')(view, _a.vignette);
        icon.signal    = 'open:video';
        break;
      case _a.folder:
        icon.kind      = KIND.wrapper;
        icon.className = _a.widget;
        //icon.className = _C.flexgrid
        icon.flow      = _a.horizontal;
        icon.template  = '#--media-ui-folder-grid';
        icon.signal    = 'open:dir';
        break;
      case _e.upload:
        icon.kind      = KIND.progress;
        icon.handler   = {ui : view};
        icon.className = "loader-progress";
        icon.on_end    = _a.close;
        icon.flow      = _a.horizontal;
        break;
      default:
        icon.kind      = KIND.wrapper;
        icon.className = _a.widget;
        icon.template  = '#--media-ui-image-grid';
        icon.url       = require('options/url/file')(view, _a.vignette);
    }
    icon.signal  = `open:${ftype}`;
    return icon;
  };
// ================================== *
//
// ================================== *

// ===========================================================
// __skl_media_icon
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __skl_media_icon = view => [_get_icon_grid(view)];
module.exports = __skl_media_icon;
