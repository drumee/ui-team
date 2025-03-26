// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/loader
//   TYPE : 
// ==================================================================== *


// ===========================================================
// _loader_form
//
// @param [Object] model
//
// @return [Object] 
//
// ===========================================================
const _loader_form = function(model) {
  const a = {
    flow:_a.vertical,
    persistence: _a.none,
    className : `${_C.box_shadow} ${_C.bg.white}`,
    showIn : _a.modal,
    persistence : true,
    styleOpt: {
      width  : _K.size.full,
      height : _a.auto,
      "min-width": _K.size.px200,
      "min-height": _K.size.px200,
      padding : _K.size.px10
    },
    kids:[{
      kind:KIND.box,
      flow:_a.horizontal,
      className:'popup-body',
      sys_pn: _a.body,//_a.front
      styleOpt: {
        width:_K.size.full,
        height:_K.size.full
      },
      kids:[{
        kind:KIND.note,
        className : "padding-left-20",
        content   : model.get(_a.content),
        flow      : _a.vertical,
        justify   : _a.center,
        styleOpt: {
          width:_K.size.full,
          height:_a.auto
        }
      },{
        kind:KIND.box,
        flow:_a.vertical,
        sys_pn: 'spinner',
        justify: 'center',
        styleOpt: {
          width:_K.size.full,
          height:_K.size.px200
        },
        kids:[{
          kind:KIND.spinner.jump,
          className : _a.absolute //model.get _a.className
        }]
      }]
    }]
  };
  return a;
};
module.exports = _loader_form;
