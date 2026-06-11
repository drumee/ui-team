
/**
 * Reset-link expired/invalid screen. Reuses the success-screen layout (Figma:
 * "Password Changed!") but with an amber clock badge and expired copy. Shown by
 * onDomRefresh when check_token reports LINK_EXPIRES / INVALID_LINK. The
 * "Back to Drumee" button (service 'goto-signin') goes to the sign-in form.
 */
function __skl_welcome_reset_link_expired(ui) {
  const fig = ui.fig.family

  const badge = Skeletons.Box.X({
    className: `${fig}__expired-badge`,
    kids: [
      Skeletons.Button.Svg({
        ico: 'apps-clock-countdown',
        className: `${fig}__expired-icon`
      })
    ]
  })

  const heading = Skeletons.Box.Y({
    className: `${fig}__success-heading`,
    kids: [
      Skeletons.Note({
        className: `${fig}__success-title`,
        content: LOCALE.LINK_EXPIRED_TITLE || 'Link Expired'
      }),
      Skeletons.Note({
        className: `${fig}__success-subtitle`,
        content: LOCALE.LINK_EXPIRED_BODY || 'This password reset link has expired or is no longer valid. Please request a new one.'
      })
    ]
  })

  const button = Skeletons.Box.X({
    className: `${fig}__success-button`,
    sys_pn: 'back-button',
    service: 'goto-signin',
    uiHandler: [ui],
    kids: [
      // active: 0 makes the label click-through, so a click anywhere on the
      // button bubbles to the 'goto-signin' service instead of being swallowed
      // by the inner Note.
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

export default __skl_welcome_reset_link_expired
