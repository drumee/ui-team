const { entry, header, button, termsAndConditions } = require("./toolkit")

function __skl_welcome_signup(ui) {
  const fig = ui.fig.family
  let digits = []
  for (let i = 0; i < 6; i++) {
    digits.push(
      Skeletons.Entry({
        name: `digit-${i}`,
        service: _a.input
      })
    )
  }
  const code = Skeletons.Box.X({
    kidsOpt: {
      className: `${fig}__digit`,
      placeholder: ""
    },
    className: `${fig}__digits`,
    kids: digits
  })

  const resend = Skeletons.Box.X({
    className: `${fig}__resend`,
    kidsOpt: {
      tagName: _K.tag.span,
    },
    kids: [
      Skeletons.Element({
        className: `${fig}__resend-text`,
        content: `${LOCALE.DIDNT_GET_EMAIL} ${LOCALE.OR}`
      }),
      Skeletons.Element({
        className: `${fig}__resend-text resend`,
        content: LOCALE.RESEND_CODE,
        service: _a.resend
      }),
    ]
  })

  let a = Skeletons.Box.Y({
    className: `${fig}__main`,
    debug: __filename,
    kids: [
      header(ui, LOCALE.DIDNT_GET_EMAIL),
      code,
      resend
    ]
  })

  return a;

}

export default __skl_welcome_signup