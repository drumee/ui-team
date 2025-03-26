/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/skeleton/search
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_search_box
//
// @param [Object] view
//
// ===========================================================
const __skl_search_box = function(view) {
  //_dbg "AAQQQ", view, view.get(_a.listClass)
  let a;
  let entry = { 
    kind        : KIND.entry,
    active      : 1,
    handler     : {
      ui        : view
    },
    signal      : _e.ui.event,
    inputClass  : "entry-area",
    placeholder : view.model.get(_a.placeholder) || LOCALE.SEARCH,
    hidden      : view.model.get(_a.hidden),
    interactive : view.model.get(_a.interactive),
    name        : view.model.get(_a.name) || _a.string,
    preselect   : view.model.get(_a.preselect),
    value       : _K.char.empty,
    api         : view.model.get(_a.api)
  };

  if (view.model.get(_a.vendorOpt) != null) {
    entry = _.merge(entry, view.model.get(_a.vendorOpt));
  }
    
  return a = [{
    kind      : KIND.box,
    flow      : _a.horizontal,
    sys_pn    : _a.search,
    className : "entry-wrapper",
    active    : 1,
    kids      : [entry]
  },{
    kind      : KIND.box,
    flow      : view.get(_a.listFlow),
    className : view.get(_a.listClass) || _a.absolute,
    sys_pn    : _a.list,
    wrapper   : 1,
    kidsOpt   : {
      className  : view.model.get(_a.itemsClass)
    }
  }];
};
module.exports = __skl_search_box;
