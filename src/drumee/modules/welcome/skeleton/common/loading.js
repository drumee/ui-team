/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : /src/drumee/modules/welcome/skeleton/common/loading.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================

function __skl_welcome_loading (_ui_) {
  const loaderFig = _ui_.fig.group

  let a = Skeletons.Box.Y({
    debug     : __filename,
    className : `${loaderFig}__loader`,
    sys_pn    : _a.loader,
    kids      : [{kind: 'spinner', mode: 'welcome'}]
  });
  
  return a;
};

export default __skl_welcome_loading
