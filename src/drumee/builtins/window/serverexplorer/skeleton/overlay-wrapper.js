// ==================================================================== *
//   Copyright Xialia.com  2011-2023
//   FILE : /ui/src/drumee/builtins/window/serverexplorer/skeleton/overlay-wrapper.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_serverexplorer_overlay_wrapper (_ui_) {
  const overlayFig = `${_ui_.fig.family}-overlay`

  const a = Skeletons.Box.X({
    debug      : __filename,
    className  : `${overlayFig}__wrapper`,
    sys_pn     : 'overlay-wrapper',
    dataset    : {
      mode    : _a.closed
    },
    kids       : [
      Skeletons.Box.X({
        className   : 'content',
        kids:[]
      }),

      Skeletons.Wrapper.X({
        className : 'overlay-notifier',
        name      : 'overlay-notifier'
      })
    ]});
  
  return a;
};

export default __skl_serverexplorer_overlay_wrapper;
