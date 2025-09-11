function __skl_welcome_signup_header(_ui_) {
  const headerFig = _ui_.fig.family

  const method = _ui_._method
  const type = _ui_._type
  const name = _ui_.data.name || ''

  let headerTitle = LOCALE.WELCOME_DRUMEE_DESK
  let content = ''

  switch (method) {
    case 'company':
      content = LOCALE.STEP_CHOOSE_URL_ADDRESS;
      break
    case _a.password:
      content = LOCALE.CREATE_YOUR_PASSWORD
      if (type == 'b2bsignup') {
        content = LOCALE.STEP_CREATE_YOUR_PASSWORD
      }
      break
    case "maiden-signup":
      content = LOCALE.CREATE_ACCOUNT
      break;
    case 'personaldata':
      content = LOCALE.STEP_ENTER_YOUR_PERSONAL_DATA
      break
    case 'otpverify':
    case 'otpresend':
    case 'change-mobile-number':
    case 'get-mobile-number':
      content = LOCALE.DOUBLE_AUTHENTICATION
      if (type == 'b2bsignup') {
        content = LOCALE.STEP_DOUBLE_AUTHENTICATION
      }
      break

  }

  if (type == 'b2bsignup') {
    headerTitle = (name.printf(LOCALE.WELCOME_TO_ORG_SYSTEM))
  }


  if (_ui_._mode == _a.loader) {
    headerTitle = LOCALE.YOUR_DRUMEE_PRIVATE_DESK_LOADING
    content = ''
    if (type == 'b2bsignup') {
      headerTitle = LOCALE.YOUR_DRUMEE_PRO_DESK_LOADING
    }
  }

  const header = Skeletons.Box.Y({
    className: `${headerFig}__header-content`,
    kids: [
      Skeletons.Note({
        className: `${headerFig}__note header`,
        content: headerTitle
      }),

      Skeletons.Note({
        className: `${headerFig}__note steps`,
        content
      })
    ]
  })

  return header;

}

export default __skl_welcome_signup_header