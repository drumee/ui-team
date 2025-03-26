/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/access-code
//   TYPE : 
// ==================================================================== *

// ----------------------------------------

// ===========================================================
// _exported
//
// @param [Object] view
//
// ===========================================================
const _exported = function(view) {
  let a;
  return a = {
    className:"login-required",
    kind:KIND.form,
    persistence: _a.always,
    flow:_a.vertical,
    persistence: _a.always,
    showIn  : _a.nested,
    styleOpt: {
      width  : _K.size.full,
      height : _a.auto,
      "min-width": _K.size.px200,
      padding   : _K.size.px5
    },
    api         : _RPC.req.guest,
    handler  : {
      ui  : view,
      api : gateway
    },
    kids:[{
      kind:KIND.note,
      content   : "Le contenu de ce site est à access restreint",
      flow      : _a.vertical,
      justify   : _a.center,
      sys_pn  : _a.header,
      styleOpt: {
        color: 'red',
        'font-size' : '18px',
        padding   : _K.size.px5,
        width:_K.size.full,
        height:_a.auto
      }
    },{
      kind    : KIND.box,
      flow      : _a.vertical,
      className : _C.formBody,
      sys_pn  : _a.body,
      styleOpt  : {
        width   : _K.size.full,
        height  : _K.size.full
      },
      kids      : [{
        name: _a.password,
        kind: KIND.entry,
        picto: _p.key,
        placeholder: "Code d'accès",
        require:"any"
      }]
    },{
      kind    : KIND.box,
      flow      : _a.horizontal,
      className : 'form-footer',
      sys_pn  : _a.footer,
      justify   : _a.right,
      styleOpt  : {
        width   : _K.size.full,
        height  : _K.size.full
      },
      kids      : [require('skeleton/button/trigger')('login')]
    }]
  };
};
module.exports = _exported;
