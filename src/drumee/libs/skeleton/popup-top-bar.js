// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/skeleton/popup-top-bar
//   TYPE :
// ==================================================================== *

//cross = '<span class="fa fa-times" aria-hidden="true"></span>'

// ===========================================================
// __popup_top_bar
//
// @param [Object] manager
// @param [Object] label
// @param [Object] svc
//
// @return [Object]
//
// ===========================================================
const __popup_top_bar = function(manager, label, ext) {
  //manager = manager || Panel
  const svg_options = {
    height: 20,
    width: 20,
    padding: 6
  };

  let opt = 
    {className : "popup-top-bar"};

  opt = _.merge(opt, ext);
  const a = SKL_Box_H(manager, {
    justify   : _a.between,
    className : opt.className,
    kidsOpt   : {
      handler : {
        ui    : manager
      }
    },
    kids : [
      SKL_Note(_a.base, label, {contentClass:_C.margin.auto_v}),
      SKL_SVG("cross",{
        contentClass  :  _C.margin.auto_v,
        service       :  _e.close,
        signal        :  _e.ui.event,
        name      : _a.context
      }, svg_options)
    ]
  });
  if (__BUILD__ === 'dev') { DBG_PATH(a, 'libs/skeleton/popup-top-bar'); }
  return a;
};
module.exports = __popup_top_bar;
