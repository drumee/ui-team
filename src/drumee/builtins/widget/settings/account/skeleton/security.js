/**
 * 
 * @param {*} ui 
 * @returns 
 */
function control(ui, title, content) {
  return Skeletons.Box.Y({
    kids: [
      Skeletons.Element({
        className: `title text`,
        content: title,
      }),
      Skeletons.Element({
        className: `content text `,
        content,
      }),
    ]
  })
}

/**
 * 
 * @param {*} ui 
 * @returns 
 */
function header(ui) {
  const fig = `${ui.fig.family}-security__header`;
  return Skeletons.Box.X({
    className: `${fig}-password`,
    kids: [
      Skeletons.Element({
        className: `label text`,
        content: LOCALE.PASSWORD,
      }),
      Skeletons.Element({
        className: `action text `,
        service: "change-password",
        content: LOCALE.CHANGE_PASSWORD,
      }),
    ]
  })
}
function menu(ui) {
  const pfx = `${ui.fig.family}-security__menu`;
  const items = Skeletons.Box.Y({
    debug: __filename,
    className: `${pfx}-items`,
    flow: _a.vertical,
    kids: [
      Skeletons.Element({
        content: LOCALE.OFF,
        className: `${pfx}-item`,
        service: 'change-mfa',
        mfa: 0
      }),
      Skeletons.Element({
        content: LOCALE.ON,
        className: `${pfx}-item`,
        service: 'change-mfa',
        mfa: 1
      }),
    ]
  });
  let mfa = LOCALE.OFF;
  if (Visitor.profile().mfa) {
    mfa = LOCALE.ON;
  }

  const trigger = Skeletons.Box.X({
    className: `${pfx}-trigger`,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Element({
        className: `${pfx}-username`,
        sys_pn: "current-mfa",
        content: mfa
      }),
      Skeletons.Button.Svg({ className: `${pfx}-trigger-icon`, ico: "carret-down" }),
    ]
  });

  return Skeletons.Box.X({
    className: `${pfx}-container`,
    debug: __filename,
    kids: [{
      kind: KIND.menu.topic,
      className: `${pfx}-content`,
      flow: _a.y,
      opening: _e.click,
      service: "user-menu",
      sys_pn: "user-dropdown",
      persistence: _a.once,
      trigger,
      items,
      shower: 1,
      offsetY: 20
    }]
  });
};


/**
 * 
 * @param {*} ui 
 * @returns 
 */
function content(ui) {
  const fig = `${ui.fig.family}-security__content`;
  return Skeletons.Box.Y({
    className: `${fig}-controls`,
    kids: [
      Skeletons.Box.G({
        className: `${fig}-control`,
        kids: [
          control(ui, LOCALE.MULTI_FACTOR_AUTH, LOCALE.MFA_TIPS),
          menu(ui),
        ]
      }),
      Skeletons.Element({ className: `${ui.fig.family}__spacer` }),
      Skeletons.Box.G({
        className: `${fig}-control`,
        kids: [
          control(ui, LOCALE.LOGOUT, LOCALE.LOGOUT_TIPS),
          Skeletons.Element({ content: LOCALE.LOGOUT, className: `button` })
        ]
      })
    ]
  })
}

/**
 *
 * @param {*} ui
 * @param {*} opt
 * @returns
 */
function storage(ui) {
  const fig = `${ui.fig.family}-security`;
  return Skeletons.Wrapper.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    kids: [
      header(ui),
      Skeletons.Element({ className: `${ui.fig.family}__spacer` }),
      content(ui)
    ]
  });

}

export default storage;
