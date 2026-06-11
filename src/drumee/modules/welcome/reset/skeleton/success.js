
/**
 * Reset-password success screen (Figma: "Password Changed!"). Shown once
 * set_password succeeds. The "Back to Drumee" button (service 'back-to-signin')
 * returns the user to the sign-in form — see ../index.js.
 */
function __skl_welcome_reset_success(ui) {
  const fig = ui.fig.family

  const badge = Skeletons.Box.X({
    className: `${fig}__success-badge`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'checked-circle',
        className: `${fig}__success-icon`
      })
    ]
  })

  const heading = Skeletons.Box.Y({
    className: `${fig}__success-heading`,
    kids: [
      Skeletons.Note({
        className: `${fig}__success-title`,
        content: LOCALE.PASSWORD_CHANGED || 'Password Changed!'
      }),
      Skeletons.Note({
        className: `${fig}__success-subtitle`,
        content: LOCALE.PASSWORD_CHANGED_BODY || 'Your password has been changed successfully.'
      })
    ]
  })

  const button = Skeletons.Box.X({
    className: `${fig}__success-button`,
    sys_pn: 'back-button',
    service: 'back-to-signin',
    uiHandler: [ui],
    kids: [
      // active: 0 makes the label click-through, so a click anywhere on the
      // button bubbles to the 'back-to-signin' service instead of being
      // swallowed by the inner Note.
      Skeletons.Note({
        className: `${fig}__success-button-label`,
        active: 0,
        content: LOCALE.BACK_TO_DRUMEE || 'Back to Drumee'
      })
    ]
  })

  return Skeletons.Box.Y({
    className: `${fig}__main ${fig}__success`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__success-content`,
        kids: [badge, heading, button]
      })
    ]
  })
}

export default __skl_welcome_reset_success
