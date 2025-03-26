// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/builtins/window/supportticket/widget/notification/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

// ----------------------------------------
//
// ----------------------------------------
const __notifier_generic = function(_ui_) {

  let state;
  const value = _ui_.mget('notificationCount') || 0;


  if (!value) {
    state = _a.closed;
  } else {
    state = _a.open;
  }
  
  const counter = {
    debug      : __filename,
    service    : 'counter',
    sys_pn     : 'counter',
    className  : `${_ui_.fig.family}__digit `,
    innerClass : `${_ui_.fig.group}__btn-counter`,
    content    : `${value}`,
    dataset    : { 
      state
    }
  };

  const a = [Skeletons.Note(counter)];

  return a;
};

export default __notifier_generic;
