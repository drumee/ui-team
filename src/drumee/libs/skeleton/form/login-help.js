// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/form/popup
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __login_help
//
// @param [Object] model
//
// @return [Object] 
//
// ===========================================================
const __login_help = function(manager) {
  const a = {
    kind:KIND.box,
    flow:_a.y,
    className : _a.absolute,
    styleOpt: {
      height: "150px",
      width : "150px"
    },
    kidsOpt : {
      active : 0
    },
    handler : {
      ui    : manager
    },
    anim : {
      start_on : _e.show,
      forward: {
        duration        : .500,
        from            : {
          x             : 0,
          autoAlpha     : 0
        },
        to              : {
          x             : 152,
          autoAlpha     : 1
        },
        ease          : Back.easeOut
      },
      name : "slide-right",
      start_on : _e.show
    },
    className : "toolbox",
    kids:[
      {kind:KIND.wrapper, tagName:'hr'},
      SKL_Note(null, "please enter your ident or email address", {contentClass:_C.margin.auto_v, userClass:'text-panel'}),
      {kind:KIND.wrapper, tagName:'hr'}
    ]
  };
  return a;
};
module.exports = __login_help;