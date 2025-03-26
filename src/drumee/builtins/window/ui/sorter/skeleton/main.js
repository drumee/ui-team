// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
let __dbg_path;
if (__BUILD__ === 'dev') {
  __dbg_path = 'desk/window/ui/sorter/sketon/main';
}

const __desk_ui_sort = function(view, list) {

  const arrow_options_name = { 
    width     : 321,
    height    : 32,
    padding   : 0
  };

  const arrow_options = { 
    width     : _K.size.full,
    height    : 32,
    padding   : 0
  };

  const a = { 
    kind       : KIND.box,
    flow       : _a.x,
    className  : "drive-list__header",
    kidsOpt    : {
      handler  : { 
        uiHandler  : view
      },
      state    : 0
    },
    kids : [
      SKL_SVG_LABEL("desktop_sortby", {
        className : "drive-list__header-item drive-list__header-item--name pl-71",
        label     : LOCALE.NAME, //"Name" #LOCALE.NAME
        service   : _e.sort,
        name      : _a.name
      }, arrow_options_name),
      SKL_SVG_LABEL("desktop_sortby", {
        className : "drive-list__header-item",
        label     : LOCALE.LAST_ACCESS,
        service   : _e.sort,
        name      : _a.date
      }, arrow_options),
      SKL_SVG_LABEL("desktop_sortby", {
        className : "drive-list__header-item",
        label     : LOCALE.SIZE, // "Size" #LOCALE.Size
        service   : _e.sort,
        name      : _a.size
      }, arrow_options)
    ]
  };
  
  if (__BUILD__ === 'dev') { DBG_PATH(a, __dbg_path); }
  return a;
};
module.exports = __desk_ui_sort;

