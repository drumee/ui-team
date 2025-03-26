function __skl_welcome_reset_password (_ui_) {
  const passwordFig = _ui_.fig.family

  const password = require('../../skeleton/password').default(_ui_, `${passwordFig}__row`, 1)

  const nextBtn = require('../../skeleton/common/button').default(_ui_, 'create-password')
  const msgBox = require('../../skeleton/common/message-box').default(_ui_)

  let a = Skeletons.Box.Y({
    className  : `${passwordFig}__items password`,
    debug      : __filename,
    kids       : [
      password,
      nextBtn,
      msgBox
    ]
  })

  return a;

}

export default __skl_welcome_reset_password