/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/modules/creator/anim/slide-x
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
const __creator_anim_slide_x = function(duration, ease, init, f, to) {
  if (duration == null) { duration = .300; }
  if (ease == null) { ease = "Back.easeOut"; }
  if (f == null) { f = -40; }
  if (to == null) { to = 0; }
  const a = {
    start_on : _e.show,
    forward: {
      duration, // || .300
      from            : {
        x             : f, // ||  -40
        autoAlpha     : 0
      },
      to              : {
        x             : to, // || 0
        autoAlpha     : 1
      },
      ease
    } // || Back.easeOut
  };
  if (_.isObject(init)) {
    a.forward.init = init;
  }
  return a;
};
module.exports = __creator_anim_slide_x;
