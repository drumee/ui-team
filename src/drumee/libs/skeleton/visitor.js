// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/visitor
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_visitor
//
// @param [Object] view
// @param [Object] ext
//
// @return [Object] 
//
// ===========================================================
const __skl_visitor = function(view, ext) {
  const pictoclass = view.get(_a.pictoClass) || _a.image;
  const id = view.get(_a.id) || Visitor.get(_a.id);
  const a = [{
    kind:KIND.box,
    flow:_a.horizontal,
    className:pictoclass,
    sys_pn: _a.image,
    styleOpt   : require('options/css/background')(view, `url('?m=drumate.photo&id=${id}')`)
  },{
    kind    : KIND.composite.box,
    label     : LOCALE.EDIT,
    picto     : _a.email,
    href    : require('options/url/bo')('edit-profile')
  }];
  if (_.isObject(ext)) {
    _.extend(a[0], ext);
  }
  return a;
};
module.exports = __skl_visitor;