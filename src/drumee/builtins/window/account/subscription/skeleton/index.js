// ==================================================================== *
//   Copyright Xialia.com  2011-2022
//   FILE : /ui/src/drumee/builtins/window/account/subscription/skeleton/index.js
//   TYPE : Skeleton
// ==================================================================== *

const __account_subscription = function(_ui_) {
  const subscriptionFig = _ui_.fig.family;

  const content = Skeletons.Box.Y({
    className : `${subscriptionFig}__content`,
    sys_pn    : _a.content,
  })

  const a = Skeletons.Box.Y({
    className : `${subscriptionFig}__main`,
    debug     : __filename,
    kids      : [
      content,
      require('./overlay-wrapper').default(_ui_)
    ]
  });

  return a; 
};

export default __account_subscription;
