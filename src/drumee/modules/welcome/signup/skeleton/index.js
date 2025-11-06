const { entry, header, button, termsAndConditions } = require("./toolkit")

function __skl_welcome_signup(ui) {
  const signupFig = ui.fig.family

  const form = Skeletons.Box.Y({
    className: `${signupFig}__form`,
    kids: [
      entry(ui, {
        placeholder: "example@email.com",
        name: _a.email,
        service: _a.input,
      }),
      button(ui, {
        label: LOCALE.CONTINUE_WITH_EMAIL,
        service: 'continue-with-apple',
        type: _a.email,
        ico: "arrow-right"
      }),
    ]
  })

  const buttons = Skeletons.Box.Y({
    className: `${signupFig}__buttons`,
    kids: [
      button(ui, {
        label: LOCALE.CONTINUE_WITH_GOOGLE,
        service: 'continue-with-google',
        type: _a.api,
        ico: "logo-google"
      }),
      button(ui, {
        label: LOCALE.CONTINUE_WITH_APPLEID,
        service: 'continue-with-apple',
        type: _a.api,
        ico: "logo-apple",
      }),
    ]
  })

  let a = Skeletons.Box.Y({
    className: `${signupFig}__main`,
    debug: __filename,
    kids: [
      header(ui, LOCALE.JOIN_DRUMEE_FOR_FREE),
      form,
      Skeletons.Element({ content: LOCALE.OR, className: `${signupFig}__separator` }),
      buttons,
      termsAndConditions(ui)
    ]
  })

  return a;

}

export default __skl_welcome_signup