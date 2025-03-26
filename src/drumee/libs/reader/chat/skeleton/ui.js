// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/reader/chat/skeleton/ui
//   TYPE : 
// ==================================================================== *

// ==================================================================== *

// ===========================================================
// __chat_ui
//
// @param [Object] view
// @param [Object] name
//
// @return [Object] 
//
// ===========================================================
const __chat_ui = function(view, name) {
  const a = {
    kind:KIND.box,
    flow:_a.vertical,
    className   : `${_C.white_box} thread`,
    kids:[{
      kind    : KIND.box,
      flow      : _a.vertical,
      className : _C.formBody,
      sys_pn    : _a.thread
    },{
      kind    : KIND.box,
      flow      : _a.vertical,
      kids      : [SKL_Entryarea(view, _a.chat, {submitKey:_a.enter, service:_a.message})]
    }]
  };
  return a;
};
module.exports = __chat_ui;