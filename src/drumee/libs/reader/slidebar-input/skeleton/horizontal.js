/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/slidebar-input/skeleton/horizontal
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_h_slidebar_input
//
// @param [Object] view
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_h_slidebar_input= function(view, ext, style) {
  let pace;
  ext = ext || {};
  if ((view.model.get(_a.pace) == null)) {
    pace  =  1;
  } else {
    pace  =  parseFloat(view.get(_a.pace));
  }
  const slider = {
    kind:KIND.slidebar,
    className:"slidebar margin-auto-v",
    updateEvent : view.model.get(_a.updateEvent),
    dragend     : "slide:end",
    styleOpt: {
      width:158,
      height:2
    }, //6 
    axis:_a.x,
    allowExceed : view.model.get(_a.allowExceed),
    vendorOpt: {
      format    : wNumb({decimals: 1}),
      range     : view.model.get(_a.range),
        // min     : min
        // max     : max
      step      : pace,
      start     : [0],
      connect   : [true, false],
      direction : 'ltr'
    },
    sys_pn  : "slidebar",
    service : "slidebar",
    signal  : _e.ui.event,
    handler: {
      ui   :view,
      part : view
    }
  };
  const ticker = SKL_Box_V(view,{
    className: 'ticker-button__wrapper',
    kidsOpt: {
      service: "ticker",
      handler: {
        ui   :view,
        part : view
      }
    },
    sys_pn : "ticker",
    kids: [
      SKL_Note("ticker", "&#x25B2;", {className:'ticker-button ticker-decrease', value: +pace}),
      SKL_Note("ticker", "&#x25BC;", {className:'ticker-button ticker-increase', value: -pace})
    ]
  });
  if (_.isObject(ext)) {
    _.extend(slider.vendorOpt, ext);
  }
  if (_.isObject(style)) {
    _.extend(slider.styleOpt, style);
  }
  const slidebar_input  = SKL_Box_H(view,{
    justify: _a.center,
    className : "slidebar-input-box",
    kidsOpt: {
      mapName    : _a.reader
    },
    kids :[
      slider,
      SKL_Box_H(view,{
        className: 'slidebar-input__wrapper',
        kids: [
          SKL_Entry(view, _a.left,{
            //templateName: _T.wrapper.input_raw
            className  : "slidebar-input-entry",
            inputClass : "entry-area",
            sys_pn     : "input-entry",
            service    : "input-entry",
            signal     : _e.ui.event,
            range      : ext.range,
            require    : _a.decimal,
            //no_label   : 1
            pace,
            handler    : {
              ui       : view,
              part     : view
            }
          }),
          ticker
        ]
      })
    ]
  });
  const a = SKL_Box_V(view,{
    className : "slidebar-input-inner",
    kids:[slidebar_input],
    mapName    : _a.reader
  });
  return a;
};
module.exports = __skl_h_slidebar_input;
