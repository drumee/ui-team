// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/modules/creator/anim/slide-y
//   TYPE : 
// ==================================================================== *

// ==================================================================== *
// ======================================================
//
// ======================================================

// ===========================================================
// __creator_anim_slide_x
//
// @param [Object] duration
// @param [Object] ease
// @param [Object] init
// @param [Object] from
// @param [Object] to
//
// @return [Object] 
//
// ===========================================================
const __creator_anim_slide_x = function(duration, ease, init, from, to) {
  const a = {
    start_on : _e.show,
    forward: {
      duration        : duration || .300,
      from            : {
        y             : from || -100,
        autoAlpha     : 0
      },
      to              : {
        y             : to || 0,
        autoAlpha     : 1
      },
      ease            : ease || Back.easeOut
    }
  };
  if (_.isObject(init)) {
    a.forward.init = init;
  }
  return a;
};
module.exports = __creator_anim_slide_x;
