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
if (__BUILD__ === 'dev') { 
  const __dbg_path = 'builtins/widget/player/document/skeleton/slider-pro';
}


// ===========================================================
// __document_slider_pro
//
// @param [Object] manager
// @param [Object] api
//
// @return [Object] 
//
// ===========================================================
const __document_slider_pro = function(manager, opt) {
  let i;
  let asc, end;
  let asc1, end1;
  const slides = [];
  for (i = 0, end = manager.info.pages-1, asc = 0 <= end; asc ? i <= end : i >= end; asc ? i++ : i--) {
    slides.push(Skeletons.Box.X({ 
      className   : "sp-slide",
      flow        : _a.none,
      // attributes  : 
      //   'data-ls' : attr
      kids : [
        Skeletons.Element({
          className  :"sp-image",
          tagName    : _K.tag.img,
          flow       : _a.none,
          position   : _a.absolute,
          attributes : { 
            src : manager._url(i)
          }
        })
      ]}));
  }

  const thumbnails = [];
  for (i = 0, end1 = manager.info.pages-1, asc1 = 0 <= end1; asc1 ? i <= end1 : i >= end1; asc1 ? i++ : i--) {
    thumbnails.push(Skeletons.Element({
      className  :"sp-thumbnail",
      tagName    : _K.tag.img,
      flow       : _a.none,
      position   : _a.absolute,
      attributes : { 
        src : manager._url(i, _a.vignette)
      }
    })
    );
  }

  const slides_wrapper = Skeletons.Box.X({ 
    className  : "sp-slides",
    kids       : slides
  });

  const thumbnails_wrapper = Skeletons.Box.X({ 
    className  : "sp-thumbnails",
    kids       : thumbnails,
    flow       : _a.none
  });

  const a = Skeletons.Box.Y({ 
    className  : "slider-pro",
    debug      : __filename,
    kids       : [slides_wrapper, thumbnails_wrapper],
    flow       : _a.none,
    sys_pn     : "slider",
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
  return a;
};
module.exports = __document_slider_pro;
