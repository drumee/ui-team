// ================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /src/drumee/widgets/electron/activity/skeleton/index.coffee
//   TYPE : Skelton
// ===================================================================**/

// ===========================================================
//
// ===========================================================
const __skl_electron_activity = function(_ui_) {
  const a = Skeletons.Box.X({
    className  : `${_ui_.fig.family}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        sys_pn : "led",
        className : `${_ui_.fig.family}__led`,
        ico: 'new_sync',
        state : 1
      }),
      Skeletons.Box.X({
        className  : `${_ui_.fig.family}__progress-container`,
        kids:[
          Skeletons.Box.X({
            className  : `${_ui_.fig.family}__progress-item`,
            sys_pn     : 'progress-item'
          }),
          Skeletons.Box.X({
            className  : `${_ui_.fig.family}__progress-total`,
            sys_pn     : 'progress-total'
          })
        ]
      })
    ]});

  return a;
};
module.exports = __skl_electron_activity;