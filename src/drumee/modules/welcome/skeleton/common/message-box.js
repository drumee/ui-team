/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/skeleton/common/message-box.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_signup_message (_ui_) {
  const message = _ui_.fig.family

  const messageBox = Skeletons.Box.X({
    className : `${message}__row message-wrapper message no-background`,
    sys_pn    : 'message-box',
    dataset   : {
      mode   : _a.closed
    }
  })

  return messageBox;

}

export default __skl_welcome_signup_message