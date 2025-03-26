// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/label-bar
//   TYPE : 
// ==================================================================== *

// ==================================================================== *
// ======================================================
//
// ======================================================

// ===========================================================
// __skl_label_bar
//
// @param [Object] view
// @param [Object] label
// @param [Object] target
//
// @return [Object] 
//
// ===========================================================
const __skl_label_bar = function(view, label, target) {

  const opt_icon = {
    width:    20,
    height:   20,
    padding:  6,
    right: -44,
    top: -32
  };

  const opt = {
    justify : _a.between,
    className : "handle",
    kidsOpt : {
      mapName : _a.reader
    },
    kids : [
      SKL_Note(_a.base, label, {contentClass:_C.margin.auto_v, className: "popup__header"}), //service:"close-box",
      SKL_SVG("cross", {service:"cancel", name:target, className: "popup__close"}, opt_icon)
      //SKL_Note(_a.base, Utils.fa('times'),
      //{
      //  contentClass:_C.margin.auto_v
      //  className: "close-box",
      //  signal   :  _e.ui.event
      //  service:"cancel",
      //  name:target
      //})
    ]
  };
  return SKL_Box_H(view, opt);
};
module.exports = __skl_label_bar;
