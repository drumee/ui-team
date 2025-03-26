/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signin/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================

function __unsupported_browser (_ui_) {
  const signinFig = `${_ui_.fig.group}`;
  const header = Skeletons.Box.Y({
    className  : `${signinFig}__header`,
    sys_pn     : _a.header,
 //   kids       : [Skeletons.Note(LOCALE.BROWSER_NOT_SUPPORTED, `${signinFig}__browsers-title`)]
  })

  const content = Skeletons.Box.Y({
    className  : `${signinFig}-unsupported-browser__content`,
    sys_pn     : _a.content,
    kids       : [require('./supported-browsers').default(_ui_)],
  })

  let a = Skeletons.Box.Y({
    className  : `${signinFig}-unsupported-browser__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${signinFig}-unsupported-browser__container`,
        kids : [
          header,
          content
        ]
      })
    ]
  })

  return a;

};

export default __unsupported_browser
