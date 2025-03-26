/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signin/skeleton/acknowledgment.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_signin_acknowledgment (_ui_, _label) {
  const ackFig = _ui_.fig.family

  let acknowledgment =  Skeletons.Note({
    className  : `${ackFig}__note message`,
    content    : _label
  })
  
  return acknowledgment;
}

module.exports = __skl_welcome_signin_acknowledgment;