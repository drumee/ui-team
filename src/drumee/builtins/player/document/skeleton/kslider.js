/*
 * decaffeinate suggestions:
 * DS202: Simplify dynamic range loops
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') { 
  __dbg_path = 'builtins/widget/player/document/skeleton/kslider';
}

//---------------------------------------
//
//---------------------------------------

// ===========================================================
// __document_kslider
//
// @param [Object] manager
// @param [Object] api
//
// @return [Object] 
//
// ===========================================================
const __document_kslider = function(manager, opt) {
  const slides = [];
  if (_.isEmpty(opt) || !_.isObject(opt)) {
    opt = { 
      slidedelay   : 4000,
      transition2d : "2,7,9"
    };
  }
  let attr = '';
  for (var k in opt) {
    var v = opt[k];
    attr = attr + `${k}: ${v};`;
  }

  for (let i = 0, end = manager.info.pages, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
    slides.push(SKL_Box_H(this, {
      className:"ls-slide",
      flow       : _a.none,
      attributes : { 
        'data-ls' : attr
      },
      kids : [
        SKL_Wrapper(null, null, {
          className  :"ls-bg",
          flow       : _a.none,
          position   : _a.absolute,
          attributes : { 
            src : manager._url(i)
          }
        })
      ]
    })
    );
  }
  _dbg("THE SLIDER WRAPPER 46", manager, slides); 
  const a = SKL_Box_H(this, {
    sys_pn     : "slider",
    kids       : slides,
    flow       : _a.none,
    attributes : {
      id       : manager._id + "-ls"
    },
    styleOpt   : { 
      width    : manager.$el.width(),
      height   : manager.$el.height(),
      position : _a.absolute,
      top      : 0,
      zIndex   : 300
    }
  });
  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = __document_kslider;
