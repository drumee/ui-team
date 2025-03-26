// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/drumate
//   TYPE : 
// ==================================================================== *

// ======================================================
//
// ======================================================

// ===========================================================
// __skl_drumate
//
// @param [Object] view
// @param [Object] ext
//
// @return [Object] 
//
// ===========================================================
const __skl_drumate = function(view, ext) {
  const img = {
    kind     : KIND.box,
    flow       : _a.horizontal,
    className  : _C.image.box,
    styleOpt   : {
      'background-image': `url('?m=drumate.photo&id=${Visitorget(_a.id)}')`
    },
    userAttributes : {
      'data-type' : 'account'
    }
  };
  const a = {
    kind     : KIND.designer.box,
    flow       : _a.horizontal,
    sys_pn     : _a.image,
    kids:[
      img,
      SKL_Note(_a.base, 3, {className:_C.box.digit}),
      SKL_Note(_a.base, LOCALE.MY_ACCOUNT, ext)
    ]
  };
  if (_.isObject(ext)) {
    _.extend(a, ext);
  }
  return [a];
};
module.exports = __skl_drumate;
