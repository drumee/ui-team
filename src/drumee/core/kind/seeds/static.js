// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/type/class/reader
//   TYPE :
// ==================================================================== *

// Static Classes cannot be overloaded
const __static_classes = { 
  blank                  : require('reader/blank'),
  box                    : require('reader/box'),
  list_smart             : require('reader/list/smart'),
  loader_snippet         : require('libs/reader/snippet'),
  note                   : require('reader/text'),
  progress               : require('reader/progress/media'),
  snippet                : require('reader/snippet'),
  spinner                : require('libs/reader/spinner'),
  svg                    : require('reader/image/svg'),
  svg_circle_percent     : require('reader/svg/circle-percent'),
  svg_gradient_circle    : require('reader/svg/gradient-circle'),
  text                   : require('libs/reader/text'),
  wrapper                : require('reader/blank')
};

module.exports = __static_classes;
