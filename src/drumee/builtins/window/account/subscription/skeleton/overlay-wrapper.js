// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/overlay-wrapper.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_subscription_overlay_wrapper (_ui_) {
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
        className   : 'overlay-content',
        kids:[]
      }),

      Skeletons.Wrapper.X({
        className : 'overlay-container',
        name      : 'overlay-container'
      })
    ]});
  
  return a;
};

export default __skl_subscription_overlay_wrapper;
