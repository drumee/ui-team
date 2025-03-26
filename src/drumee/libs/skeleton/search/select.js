/*
 * decaffeinate suggestions:
 * DS103: Rewrite code to no longer use __guard__, or convert again using --optional-chaining
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/search/select
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __search_select
//
// @param [Object] model
//
// @return [Object] 
//
// ===========================================================
const __search_select = function(model) {
  const left  = __guard__(model.get(_a.position), x => x.left) || 0;
  const right = __guard__(model.get(_a.position), x1 => x1.right) || 0;
  const a = {
    flow:_a.widget,
    direction : _a.horizontal,
    kind:KIND.search,
    name : model.get(_a.name),
    value : model.get(_a.value),
    className : model.get(_a.className) || 'search',
    userClass : model.get(_a.userClass) || _C.margin.auto_v,
    styleOpt: {
      border: "1px solid #eee",
      'padding-right': "10px"
    },
    kids:[{
      sys_pn  : "selector",
      kind:KIND.box,//_t.box
      flow:_a.horizontal,
      kids:[{
        value : model.get(_a.value),
        label : model.get(_a.value),
        kind:KIND.button.trigger,
        sys_pn  : _a.value,
        userAttributes: {
          'data-hide' : _a.no
        },
        styleOpt: {
          padding: "0 10px"
        }
      },{
        kind:KIND.entry.search,
        sys_pn  : _a.entry, // _a.list
        userClass : _C.flexgrid,
        modelArgs : {
          picto : _p.search
        },
        api:model.get(_a.api)
      }]
    },{
      sys_pn  : _a.results, // _a.list
      kind:KIND.list.composite,
      className : _a.relative,
      listClass : "box-shadow bg-white absolute",
      userClass  : _C.flexgrid,
      listView  : model.get(_a.listView),
      childView : model.get(_a.childView),
      kidsOpt  : model.get(_a.kidsOpt),
      kidsMap   : model.get(_a.kidsMap),
      flow:_a.vertical,
      evArgs: {
        className : _a.none,
        modelArgs : {
          content : _K.char.empty
        }
      },
      styleOpt: {
        'margin-top':_K.size.px5,
        left,
        right: 0,
        top : _K.size.full,
        width:_K.size.full,
        //'max-width' : "420px"
        height:_a.auto,
        position:_a.absolute
      }
    }]
  };
  return a;
};
module.exports = __search_select;
function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}