/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/utils/options/spin
//   TYPE : 
// ==================================================================== *

  // ============================================
  // small spinner options
  // ============================================

// ===========================================================
// _exported
//
// @param [Object] size
// @param [Object] color
//
// ===========================================================
const _exported =   function(size, color) {
  let a;
  if (color == null) { color = 'bleu'; }
  const length = {
    xs    : 5,
    small : 10,
    large : 15
  };
  const width = {
    xs    : 2,
    small : 5,
    large : 7
  };
  const radius = {
    xs    : 5,
    small : 15,
    large : 30
  };
  const lines = {
    xs    : 9,
    small : 11,
    large : 13
  };
  const l = length[size] || 10;
  const w = width[size]  || 5;
  const r = radius[size] || 7;
  const L = lines[size]  || 9;
  return a = { 
    lines: L, // The number of lines to draw
    length: l, // The length of each line
    width: w, // The line thickness
    radius: r, // The radius of the inner circle
    scale: 1, // Scales overall size of the spinner
    corners: 1, // Corner roundness (0..1)
    color, // #rgb or #rrggbb or array of colors
    opacity: 0.25, // Opacity of the lines
    rotate: 0, // The rotation offset
    direction: 1, // 1: clockwise, -1: counterclockwise
    speed: 1, // Rounds per second
    trail: 60, // Afterglow percentage
    fps: 20, // Frames per second when using setTimeout() as a fallback for CSS
    zIndex: 2e9, // The z-index (defaults to 2000000000)
    className: 'spinner', // The CSS class to assign to the spinner
    top: '50%', // Top position relative to parent
    left: '50%', // Left position relative to parent
    shadow: false, // Whether to render a shadow
    hwaccel: false, // Whether to use hardware acceleration
    position: _a.absolute // Element positioning
  };
};
module.exports = _exported;
