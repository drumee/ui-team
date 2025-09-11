
function button(_ui_, content, c = 1) {
  const fig = `${_ui_.fig.family}-gateway`;
  let b = Skeletons.Box.G({
    className: `${fig}__icons c-${c}`,
    kids: []
  });

  for (var i = 1; i <= c; i++) {
    b.kids.push(
      Skeletons.Button.Svg({
        ico: 'account_ip',
        className: `${fig}__icon icon-${i}`,
      }),
    )
  }
  let type = '';
  if (c == 1) {
    type = 'personal';
  } else {
    type = 'company';
  }
  var a = Skeletons.Box.Y({
    className: `${fig}__button OOOO`,
    kids: [b, Skeletons.Note({
      className: `${fig}__text ${type}`,
      content
    })]
  })
  const { protocol, user_domain, isElectron, endpointPath } = bootstrap();
  if (c == 1) {
    let base = '';
    if (!isElectron) {
      base = `${protocol}://${user_domain}${endpointPath}`;
    }
    a.href = `${base}${_K.module.welcome}/signin/auth`
  } else {
    a.href = `${_K.module.welcome}/signin/url`
  }
  return a;
}

function __skl_welcome_signin_gateway(_ui_) {
  const fig = `${_ui_.fig.family}-gateway`;

  return {
    header: Skeletons.Note({
      className: `${fig}__title`,
      content: LOCALE.LOGIN_DRUMEE_ACCOUNT
    }),
    content: Skeletons.Box.X({
      className: `${fig}__buttons`,
      kids: [
        button(_ui_, LOCALE.DRUMEE_DESK, 1),
        button(_ui_, LOCALE.DRUMEE_COMPANY, 3)
      ]
    })
  };

};


module.exports = __skl_welcome_signin_gateway;
