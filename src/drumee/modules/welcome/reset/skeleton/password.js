

function __skl_welcome_reset_password(ui) {
  const fig = ui.fig.family

  const password = require('../../skeleton/password').default(ui, `${fig}__passmeter`, 1)

  // const nextBtn = require('../../skeleton/common/button').default(ui, 'create-password')
  const msgBox = require('../../skeleton/common/message-box').default(ui)

  let a = Skeletons.Box.Y({
    className: `${fig}__content-password`,
    debug: __filename,
    kids: [
      password,
      msgBox
    ]
  })

  return a;

}

export default __skl_welcome_reset_password