// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : desk/counter/project/skeleton/wait
//   TYPE : Skelton
// ==================================================================== *

const __hub_slk_wait = function(_ui_, name) {

  const msg = (name.printf(LOCALE.WAIT_FOR_CREATION));
  const a = Skeletons.Note({
    className : "full media-ui-message",
    content   : msg,
    sys_pn    : _a.message,
    part    : this,
    uiHandler   : this, 
    debug : __filename
  });
  return a;
};
module.exports = __hub_slk_wait;
