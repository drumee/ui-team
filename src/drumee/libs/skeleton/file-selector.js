// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/file-selector
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_fsel
//
// @param [Object] key
// @param [Object] ext
// @param [Object] style
//
// @return [Object] 
//
// ===========================================================
const __skl_fsel = function(key, ext, style) {
  const target = {
    kind:KIND.utils.wrapper,
    flow:_a.horizontal,
    templateName: _T.wrapper.fselector,
    className:"out-of-screen",
    sys_pn: key || 'fselector',
    styleOpt: {
      width:_K.size.full,
      height:_K.size.px10
    }
  };
  if (_.isObject(ext)) {
    _.extend(target, ext);
  }
  if (_.isObject(style)) {
    _.extend(target.styleOpt, style);
  }
  return target;
};
module.exports = __skl_fsel;
