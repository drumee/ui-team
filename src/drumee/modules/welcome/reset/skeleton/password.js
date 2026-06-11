
const PILLS = [
  { sys_pn: 'pill-min', label: LOCALE.PW_RULE_MIN },
  { sys_pn: 'pill-uppercase', label: LOCALE.PW_RULE_UPPERCASE },
  { sys_pn: 'pill-number', label: LOCALE.PW_RULE_NUMBER },
  { sys_pn: 'pill-symbol', label: LOCALE.PW_RULE_SYMBOL }
]

/**
 * A single requirement pill (cross/grey -> check/green when satisfied).
 */
function pill(ui, sys_pn, label) {
  const fig = ui.fig.family
  return Skeletons.Box.X({
    className: `${fig}__pill`,
    sys_pn,
    dataset: { state: 0 },
    kids: [
      Skeletons.Button.Svg({
        ico: 'cross',
        className: `${fig}__pill-ico`
      }),
      Skeletons.Note({
        className: `${fig}__pill-label`,
        content: label
      })
    ]
  })
}

/**
 * One labelled password field: label + input row with a trailing eye toggle.
 */
function passwordField(ui, { sys_pn, label, placeholder }) {
  const fig = ui.fig.family
  return Skeletons.Box.Y({
    className: `${fig}__entry-main`,
    kids: [
      Skeletons.Note({
        className: `${fig}__entry-label`,
        content: label
      }),
      Skeletons.Box.X({
        className: `${fig}__entry-row`,
        kids: [
          Skeletons.EntryBox({
            type: _a.password,
            className: `${fig}__entry-input`,
            sys_pn,
            name: _a.password,
            placeholder,
            mode: _a.commit,
            uiHandler: [ui]
          }),
          Skeletons.Button.Svg({
            ico: 'eye_closed',
            className: `${fig}__entry-eye-toggle`,
            service: 'toggle-password-visibility',
            uiHandler: [ui]
          })
        ]
      })
    ]
  })
}

function __skl_welcome_reset_password(ui) {
  const fig = ui.fig.family

  const newPassword = passwordField(ui, {
    sys_pn: 'ref-password',
    label: LOCALE.NEW_PASSWORD,
    placeholder: LOCALE.ENTER_YOUR_NEW_PASSWORD
  })

  const pills = Skeletons.Box.X({
    className: `${fig}__pills`,
    kids: PILLS.map((p) => pill(ui, p.sys_pn, p.label))
  })

  const confirmPassword = passwordField(ui, {
    sys_pn: 'ref-confirm',
    label: LOCALE.CONFIRM_PASSWORD,
    placeholder: LOCALE.CONFIRM_YOUR_NEW_PASSWORD
  })

  // "Passwords match" tag under the confirm field.
  const matchPill = Skeletons.Box.X({
    className: `${fig}__pills`,
    kids: [pill(ui, 'pill-match', LOCALE.PW_RULE_MATCH || 'Passwords match')]
  })

  const msgBox = require('../../skeleton/common/message-box').default(ui)

  return Skeletons.Box.Y({
    className: `${fig}__content-password`,
    debug: __filename,
    kids: [
      newPassword,
      pills,
      confirmPassword,
      matchPill,
      msgBox
    ]
  })
}

export default __skl_welcome_reset_password
