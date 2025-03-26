// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : /src/drumee/modules/skeleton/grid.js
//   TYPE : Skeleton
// ==================================================================== *

const OPEN_NODE = 'open-node';

// ===========================================================
// __dmz_media_list
//
// @param [Object] view
// @param [Object] api
//
// @return [Object] 
//
// ===========================================================
const __dmz_media_list = function(view, data) {

  for (let item of Array.from(data)) { 
    item.kind    = _a.media;
    item.service = OPEN_NODE;
    item.uiHandler = view;
  }
  const a = {
    kind        : KIND.list.smart,
    className   : "drive-list",
    innerClass  : "drive-content-scroll",
    sys_pn      : _a.list,
    flow        : _a.none,
    debug       : __filename,
    uiHandler   : view,
    styleOpt    : { 
      width     : window.innerWidth/4, 
      height    : Math.max(window.innerHeight - 600, 100)
    },
    kids        : data, 
    vendorOpt: {
      size      : "2px",
      opacity   : "1",
      color     : "#FA8540",
      distance  : "2px"
    }    
  };
  return a;
};
module.exports = __dmz_media_list;
