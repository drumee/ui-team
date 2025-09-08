
function __skl_welcome_password(ui, cn, passmeter) {

  cn = cn || `${ui.fig.group}__row ${ui.fig.family}__row`;

  const a = Skeletons.Box.X({
    className: `${cn} entry-status`,
    sys_pn: 'wrapper-pw',
    partHandler: [ui],
    kids: [
      Skeletons.Button.Svg({
        ico: "profile-lock",
        className: `${ui.fig.group}__icon ${ui.fig.family}__icon lock`
      }),

      Skeletons.EntryBox({
        uiHandler: [ui],
        type: _a.password,
        className: `${ui.fig.group}__entry ${ui.fig.family}__entry`,
        service: _e.submit,
        name: _a.password,
        placeholder: LOCALE.PASSWORD,
        mode: _a.commit,
        sys_pn: 'ref-password',
        require: _a.password,
        shower: 1
      })
    ]
  });

  if (passmeter) {
    a.kids.unshift(Skeletons.Box.X({
      className: `${ui.fig.group}__pw-meter widget__pw-meter wrapper`,
      kids: [
        Skeletons.Box.X({
          className: `${ui.fig.group}__pw-meter widget__pw-meter score-limit`,
          sys_pn: 'ref-pwm-score-limit'
        }),

        Skeletons.Box.X({
          className: `${ui.fig.group}__pw-meter widget__pw-meter bar-holder`,
          kids: [
            Skeletons.Element({
              className: `${ui.fig.group}__pw-meter widget__pw-meter strength`,
              sys_pn: 'ref-pwm'
            })
          ]
        }),

        Skeletons.Button.Svg({
          ico: 'info',
          className: `${ui.fig.group}__pw-meter widget__pw-meter info`,
          tooltips: {
            content: LOCALE.DIGITS_MINIMUM_COMBINE
          }
        })
      ]
    }));
  }

  return a;

};

export default __skl_welcome_password;
