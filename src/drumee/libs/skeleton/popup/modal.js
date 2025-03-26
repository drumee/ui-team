// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/popup/modal
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __popup_modal
//
// @param [Object] kids
//
// @return [Object] 
//
// ===========================================================
const __popup_modal = function(kids) {
  if (!_.isArray(kids)) {
    kids = [kids];
  }
  const a = {
    cvType: "modal",
    flow: _a.vertical,
    kind: KIND.box,
    styleOpt: {
      width: _K.size.full,
      height: _K.size.full,
      'min-height': "400px"
    },
    kids: [{
      kind: "image_svg",
      flow: _a.vertical,
      chartId: "cross-close",
      signal: "close",
      styleOpt: {
        width: _K.size.px30,
        height: _K.size.px30,
        position: _a.absolute,
        right: 0,
        top: 0,
        'background-color': 'rgba(255,255,255, .3)',
        'border-radius': "50%",
        overflow: _a.hidden,
        'z-index': 2000,
        padding: _K.size.px5,
        'margin-right': _K.size.px10,
        'margin-top': _K.size.px10
      }
    },{
      kind: KIND.box,
      styleOpt: {
        padding: _K.size.px5,
        width: _K.size.full,
        'min-height': "140px",
        height: _K.size.full
      },
      flow: _a.vertical,
      kids
  }]
  };
  return a;
};
module.exports = __popup_modal;