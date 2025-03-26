// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   TYPE : Skelton
// ==================================================================== *

// ----------------------------------------
//
// ----------------------------------------
const __notifier_generic = function(_ui_, data){

  let state;
  data = data || {};

  const pfx = "desk-topbar";

  const icon_options = {
    width   : 40,
    height  : 40,
    padding : 10
  };
  const value = data.count || "";

  if (!~~value) {
    state = _a.closed;
  } else {
    state = _a.open;
  }
  
  const counter = { 
    service    : "counter",
    sys_pn     : "counter",
    className  : `${_ui_.fig.family}__digit `,
    innerClass : `${_ui_.fig.group}__btn-counter`,
    content    : value,
    dataset    : { 
      state
    }
  };

  const a = [Skeletons.Note(counter)];

  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __notifier_generic;
