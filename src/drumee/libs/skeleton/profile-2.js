// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/profile-2
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_profile
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __skl_profile = function(view) {
  const labelOpt = {
    contentClass:_C.margin.auto,
    padding:_K.size.px5,
    width:_a.auto,
    height : _K.size.px30
  };
  const a = [{
    kind:KIND.box,
    flow:_a.vertical,
    sys_pn: _a.photo,
    'z-index' : 10,
    className : _C.margin.auto_h,
    kidsOpt : {
      className  : "pointer"
    },
    styleOpt: {
      width  : _K.size.px100,
      height : _K.size.px100,
      'border-radius': _K.size.half
    },
    kids:[SKL_Upload_Progress(view, null, {left:0, height:100, width:100, 'border-radius': '50%'})]
  },{
    kind:KIND.box,
    flow:_a.horizontal,
    sys_pn: _a.label,
    'z-index' : 10,
    className : _C.margin.auto,
    justify: _a.center,
    kidsOpt : {
      className  : "pointer"
    },
    styleOpt: {
      width  : _K.size.full,
      height : _a.auto,
      padding : _K.size.px5
    },
    kids:[
      SKL_SVG(null, {kind:KIND.image.svg}),
      SKL_Note(_a.base, Visitor.get('fullname'), labelOpt)
    ]
  }];
  return a;
};
module.exports = __skl_profile;