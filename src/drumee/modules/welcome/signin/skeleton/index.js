/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signin/skeleton/index.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================

function __skl_welcome_signin (_ui_, opt, type="") {
  const fig = _ui_.fig.family
  let dataset = _ui_.mget(_a.dataset) || {};
  let a = Skeletons.Box.Y({
    className  : `${fig}__main`,
    debug      : __filename,
    kids       : [
      Skeletons.Box.Y({
        className  : `${fig}__container`,
        dataset,
        kids : [
          Skeletons.Box.Y({
            className  : `${fig}__header`,
            sys_pn     : _a.header,
            dataset,
            kids : [opt.header]
          }),
          Skeletons.Box.Y({
            className  : `${fig}__content ${type}`,
            sys_pn     : _a.content,
            kids : [opt.content]
          })
        ]
      })
    ]
  })

  return a;

};

module.exports = __skl_welcome_signin;
