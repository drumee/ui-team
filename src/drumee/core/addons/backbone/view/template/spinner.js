// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/core/backbone/view/spinner.coffee
//   TYPE : Skeleton
// ==================================================================== *

const __media_spinner = function(_ui_) {
  const mode = _ui_.mget(_a.mode) || _a.small;

  return `\
<div id='${_ui_._id}-loading-wrapper' class='drumee-loading drumee-loading-wrapper'> \
<div class='loader-wrapper'> \
<div class='loader ${mode}'></div> \
<div class='loader ${mode}'></div> \
<div class='loader ${mode}'></div> \
<div class='loader ${mode}'></div> \
<div class='loader ${mode}'></div> \
</div> \
</div>\
`;
};

module.exports = __media_spinner;