// ==================================================================== *
//   Copyright Xialia.com  2011-2018
//   FILE : ../src/drumee/libs/skeleton/progress-bar
//   TYPE : 
// ==================================================================== *


// ===========================================================
// __skl_progress_bar
//
// @param [Object] view
//
// @return [Object] 
//
// ===========================================================
const __skl_progress_bar = function(view) {
  const a = [{
    kind : KIND.box,
    flow   : _a.vertical,
    className : view.get('className'),
    kids   : [{
      kind: KIND.box,
      flow: _a.horizontal,
      className: 'full-width',
      justify : _a.center,
      styleOpt : {
        'margin-bottom' : '20px'
      },
      sys_pn    : 'title',
      kids: [
        SKL_Note(_a.base, "Progress bar", {className:'label'}),
        SKL_Note(_a.base, "??", {className:'value'}),
        SKL_Note(_a.base, "Unit", {className:'unit'})
      ]
    },{
        kind : KIND.box,
        flow   : _a.horizontal,
        kids   : [{
          kind    : KIND.box,
          flow      : _a.horizontal,
          className : view.get('barsClass'),
          kids   : [{
            kind    : KIND.box,
            className : 'full-bar',
            sys_pn    : 'full-bar'
          },{
            kind    : KIND.box,
            className : 'empty-bar',
            sys_pn    : 'empty-bar'
          },
            SKL_Note(_a.base, "0", {className:'min', readonly : 1}),
            SKL_Note(_a.base, "10", {className:'max', readonly : 1})
          ]
        }]
      }
    ]
  }];
  return a;
};
module.exports = __skl_progress_bar;