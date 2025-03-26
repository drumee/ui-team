/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/media/ui
//   TYPE : 
// ==================================================================== *

// -------------------------------------
//
// -------------------------------------

// ===========================================================
// _get_tick
//
// @param [Object] view
//
// ===========================================================
const _get_tick = function(view) {
  let head;
  const aspect = view.get(_a.aspect) || _a.row;
  const ftype  = view.get(_a.filetype) || _a.other;
  return head =
    {kind   : KIND.checkbox};
};
// -------------------------------------
//
// -------------------------------------

// ===========================================================
// _get_icon_row
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const _get_icon_row = function(view) {
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
        icon.className = _C.flexgrid;
        icon.flow      = _a.horizontal;
        icon.template  = '#--media-ui-image-row';
        icon.url       = require('options/url/file')(view, _a.vignette);
        break;
      case _a.video:
        icon.kind      = KIND.wrapper;
        icon.className = _C.flexgrid;
        icon.template  = '#--media-ui-video-row';
        icon.flow      = _a.horizontal;
        icon.src       = require('options/url/file')(view, _a.video) + '.mp4';
        icon.img       = require('options/url/file')(view, _a.vignette);
        break;
      case _a.folder:
        icon.kind      = KIND.wrapper;
        icon.className = _C.flexgrid;
        icon.template  = '#--media-ui-folder-row';
        icon.flow      = _a.horizontal;
        break;
      case _e.upload:
        icon.kind      = KIND.progress;
        icon.handler   = {ui : view};
        icon.className = `${_C.flexgrid} loader-progress`;
        icon.on_end    = _a.close;
        icon.flow      = _a.horizontal;
        break;
      default:
        icon.kind      = KIND.wrapper;
        icon.className = _C.flexgrid;
        icon.flow      = _a.horizontal;
        icon.template  = '#--media-ui-image-row';
        icon.url       = require('options/url/file')(view, _a.vignette);
    }
    icon.signal  = `open:${ftype}`;
    return icon;
  };
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
        icon.className = `${_C.flexgrid} loader-progress`;
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
// __skl_media_main
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __skl_media_main = function(view) {
  let icon;
  const aspect = view.get(_a.aspect) || _a.row;
  if (aspect === _a.row) {
    icon = _get_icon_row(view);
  } else {
    icon = _get_icon_grid(view);
  }
//  a =[icon, SKL_Box_H(view, {className : "menu-#{aspect}", sys_pn: _a.menu}, {width:120})]
  const tick = {
    kind      : KIND.checkbox,
    className : `tick-${view.get(_a.aspect)}`
  };
  const a = [tick, icon, SKL_Box_H(view, {className : `menu-${aspect}`, sys_pn: _a.menu}, {width:120})];
  if (view.get(_a.filetype) === _a.folder) {
    const z = SKL_Box_H(view, {kids:a});
    const kids = [
      SKL_Box_H(view, {kids:a}),
      SKL_Box_V(view, {sys_pn: _a.content, className:_C.box_shadow}, {'margin-left': 30})
    ];
    if (aspect === _a.row) {
      const b = SKL_Box_V(view, {className: _C.flexgrid, kids});
      return [b];
    }
  }
  return a;
};
module.exports = __skl_media_main;
