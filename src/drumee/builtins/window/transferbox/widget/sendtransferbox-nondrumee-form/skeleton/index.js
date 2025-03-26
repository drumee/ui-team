/* ================================================================== *
 * Copyright Xialia.com  2011-2021
 * FILE : src/drumee/builtins/window/transferbox/widget/sendtransferbox-nondrumee-form/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

function __skl_nondrumeete_form  (_ui_) {
  const familyFig = `${_ui_.fig.family}`;

  let a = Skeletons.Box.Y({
    className  : `${familyFig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.X({
        className   : `${familyFig}__container`,
        kids        : [
          require('./form').default(_ui_)
        ]
      })
    ]
  })

  return a;
}

export default __skl_nondrumeete_form;