// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : /src/drumee/modules/welcome/skeleton/password.js
//   TYPE : Skeleton
// ==================================================================== *

function __skl_welcome_password(_ui_, cn, passmeter) {

  cn = cn || `${_ui_.fig.group}__row ${_ui_.fig.family}__row`;

  const a = Skeletons.Box.X({
    className: cn,
    sys_pn: 'wrapper-pw',
    kids: [
      Skeletons.Button.Svg({
        ico: "profile-lock",
        className: `${_ui_.fig.group}__icon ${_ui_.fig.family}__icon lock`
      }),

      Skeletons.EntryBox({
        uiHandler: [_ui_],
        type: _a.password,
        className: `${_ui_.fig.group}__entry ${_ui_.fig.family}__entry`,
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
      className: `${_ui_.fig.group}__pw-meter widget__pw-meter wrapper`,
      kids: [
        Skeletons.Box.X({
          className: `${_ui_.fig.group}__pw-meter widget__pw-meter score-limit`,
          sys_pn: 'ref-pwm-score-limit'
        }),

        Skeletons.Box.X({
          className: `${_ui_.fig.group}__pw-meter widget__pw-meter bar-holder`,
          kids: [
            Skeletons.Element({
              className: `${_ui_.fig.group}__pw-meter widget__pw-meter strength`,
              sys_pn: 'ref-pwm'
            })
          ]
        }),

        Skeletons.Button.Svg({
          ico: 'info',
          className: `${_ui_.fig.group}__pw-meter widget__pw-meter info`,
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
