// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/modules/drive/skeleton/browser/search
//   TYPE : 
// ==================================================================== *

// ===========================================================
// _browser_search
//
// @param [Object] view
// 
// 
//
// ===========================================================
const _browser_search = function(manager) {
  const svg_options = { 
    width   : 12,
    height  : 12,
    padding : 0
  };

  const std_size = SKL_SVG("desktop_lineview", {
    className : "drive-popup__bar-icon aspect mr-18",
    service   : "change-size",
    value     : _a.normal
  }, svg_options);

  const full_size = SKL_SVG("desktop_fullview", {
    className : "drive-popup__bar-icon mr-18",
    service   : "change-size",
    value     : 'full'
  }, svg_options);

  const close = SKL_SVG("cross", {
    className : "drive-popup__bar-icon drive-popup__bar-icon--close mr-10", 
    service: "close-search",
    handler : {
      uiHandler: Desk
    }
  }, svg_options);

  const _top_bar = SKL_Box_H(manager, {
    className: "drive-popup__bar pt-10 pb-8 ml-17 mr-7 u-jc-sb mb-20",
    kids: [
      SKL_Box_H(manager, {
        kidsOpt: { 
          radio: "tab-radio-group"
        },
        kids: [
          SKL_Note(null, "Last opened", {className : "search-popup__bar-item mr-15 u-ai-center", initialState: 1}),
          SKL_Note(null, "Last modified", {className : "search-popup__bar-item mr-15 u-ai-center"}),
          SKL_Note(null, "Created", {className : "search-popup__bar-item mr-15 u-ai-center"}),
          SKL_Note(null, "Type", {className : "search-popup__bar-item mr-15 u-ai-center"}),
          SKL_Note(null, "Name", {className : "search-popup__bar-item u-ai-center"})
        ]
      }),
      SKL_Box_H(manager, {
        className : "browser-top-bar-right u-ai-center",
        kids : [
          std_size,
          full_size,
          close
        ]
      })  
    ]
  });

  const _content = SKL_Box_V(manager, {
    className:'drive-content',
    sys_pn : _a.content
    // styleOpt: size
      //width  : _K.size.full
      //height : height || parseInt(window.innerHeight/4)
  });

  const _main = SKL_Box_V(manager, {
    className: "search-popup__menu",
    styleOpt: {
      width: 145,
      height: _K.size.full
    },
    kidsOpt: { 
      radio: "menu-radio-group"
    },
    kids: [
      SKL_Note(null, "Today", {className : "search-popup__menu-item u-ai-center"}),
      SKL_Note(null, "Yesterday", {className : "search-popup__menu-item u-ai-center"}),
      SKL_Note(null, "Last 10 days", {className : "search-popup__menu-item u-ai-center"}),
      SKL_Note(null, "This month", {className : "search-popup__menu-item u-ai-center"}),
      SKL_Note(null, "August", {className : "search-popup__menu-item u-ai-center"}),
      SKL_Note(null, "July", {className : "search-popup__menu-item u-ai-center"}),
      SKL_Note(null, "June", {className : "search-popup__menu-item u-ai-center"}),
      SKL_Note(null, "May", {className : "search-popup__menu-item u-ai-center"})
    ]
  });

  const a = {
    kind        : KIND.box,
    flow        : _a.vertical,
    className   : "drive-popup search-popup",
    styleOpt    : {
      width       : window.innerWidth * 0.9,
      height      : window.innerHeight * 0.8
    },
    kids        : [
      _top_bar,
      _main
    ]
  };

  if (__BUILD__ === 'dev') { DBG_PATH(a, 'modules/drive/skeleton/browser/search'); }
  return a;
};

module.exports = _browser_search;