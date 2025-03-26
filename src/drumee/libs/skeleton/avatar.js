// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : src/drumee/libs/skeleton/avatar
//   TYPE :
// ==================================================================== *


// ===========================================================
// __slk_avatar
//
// @param [Object] key
//
// @return [Object]
//
// ===========================================================



const __slk_avatar = function() {
  //_dbg "3eee", avatar, url
  //if Visitor.profile().profile_image is false => 
  // WARNING : profile_imag is not significant on the backend side 
  // So, don't use it. When no avatar is set, profile.avatar is empty or 'default'
  let target;
  if ((Visitor.profile().avatar === 'default') || _.isEmpty(Visitor.get(_a.profile).avatar)) {
    target = { 
      chartId   : "desktop_account--white",
      className : "c-top-bar__avatar eeez",
      kind      : KIND.image.svg
    };
  } else {
    target = { 
      className : "c-top-bar__avatar eeez",
      kind      : KIND.profile,
      styleOpt  : { 
        padding: 0,
        border: "none"
      }
    };
  }
  return target;
};
module.exports = __slk_avatar;
