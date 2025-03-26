/* ================================================================== *
 * Copyright Xialia.com  2011-2020
 * FILE : /src/drumee/modules/welcome/signup/skeleton/header.js
 * TYPE : Skeleton
 * ===================================================================**/

// ===========================================================
//
// ===========================================================
function __skl_welcome_signup_header (_ui_) {
  const headerFig = _ui_.fig.family 

  const method = _ui_._method
  const type = _ui_._type
  const name = _ui_.data.name || ''

  let headerTitle = LOCALE.WELCOME_DRUMEE_DESK
  let _content = ''

  if (type == 'b2bsignup') {
    headerTitle = (name.printf(LOCALE.WELCOME_TO_ORG_SYSTEM))
  }

  if (method == 'company') {
    _content =  LOCALE.STEP_CHOOSE_URL_ADDRESS
  }

  if (method == _a.password) {
    _content = LOCALE.CREATE_YOUR_PASSWORD
    if (type == 'b2bsignup') {
      _content = LOCALE.STEP_CREATE_YOUR_PASSWORD
    }
  }

  if (method == 'personaldata') {
    _content = LOCALE.STEP_ENTER_YOUR_PERSONAL_DATA
  }

  if ((method == 'otpverify') || (method == 'otpresend') || (method == 'change-mobile-number') || (method == 'get-mobile-number')){
    _content = LOCALE.DOUBLE_AUTHENTICATION

    if (type == 'b2bsignup') {
      _content = LOCALE.STEP_DOUBLE_AUTHENTICATION
    }
  }

  if (_ui_._mode == _a.loader) {
    headerTitle = LOCALE.YOUR_DRUMEE_PRIVATE_DESK_LOADING
    _content = ''
    if (type == 'b2bsignup') {
      headerTitle = LOCALE.YOUR_DRUMEE_PRO_DESK_LOADING
    }
  }

  const header = Skeletons.Box.Y({
    className  : `${headerFig}__header-content`,
    kids       : [
      Skeletons.Note({
        className  : `${headerFig}__note header`,
        content    : headerTitle
      }),

      Skeletons.Note({
        className  : `${headerFig}__note steps`,
        content    : _content
      })
    ]
  })

  return header;

}

export default __skl_welcome_signup_header