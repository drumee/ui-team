// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/popup/confirm
//   TYPE : 
// ==================================================================== *

// ==================================================
// ==================================================

// ===========================================================
// __skl_popup_confirm
//
// @param [Object] view
// @param [Object] label
// @param [Object] ext
//
// @return [Object] 
//
// ===========================================================
const __skl_popup_confirm = function(view, label, ext) {
  //btn_class  = 'pointer bg-white padding-10'
  let body;
  const yes_opt     = {contentClass:_C.margin.auto, className: "btn btn--confirm", service: "success"};
  const no_opt      = {contentClass:_C.margin.auto, className: "btn btn--cancel", service: "cancel"};
  const buttons = SKL_Box_H(view, {
      className: "popup__btn-block u-jc-sb",
      kids: [
        SKL_Note(null, "Cancel", no_opt),
        SKL_Note(null, LOCALE.DELETE, yes_opt)
      ]
    });

  if (_.isString(ext)) {
    body = SKL_Note(null, ext, {className:'popup__text popup__text--regular'});
  } else if (_.isArray(ext)) {
    body = ext;
  } else if (_.isObject(ext)) {
    body = [ext];
  } else {
    body = SKL_Note(null, "Sure ?", {className:'popup__text popup__text--regular'});
  }

  const a = {
    kind:KIND.box,
    flow:_a.vertical,
    // styleOpt:
    //   "min-height": "100px"
    //   "min-width" : "200px"
    //   overflow    : _a.hidden
    kidsOpt: {
      mapName : _a.reader,
      signal  : _e.ui.event,
      handler    : {
        ui       : view
      }
    },
    className : "popup__inner popup__inner--small",
    kids:[
      SKL_SVG("account_cross",{
        className     :  "popup__close",
        service       :  "cancel",
        signal        :  _e.ui.event
      }, {
        height  : 36,
        width   : 36,
        padding : 12
      }),
      SKL_Note(null, label, {className:"popup__header"}),
      // require('skeleton/label-bar')(view, label)
      // SKL_Box_V view, {kids:body, justify:_a.center}, {width: _K.size.full}
      body,
      // SKL_Box_H view, {kids:buttons, justify:_a.center, className:"popup__btn-group"}
      buttons
    ]
  };
  return a;
};
module.exports = __skl_popup_confirm;
