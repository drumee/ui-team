function __skl_welcome_signin_content(ui) {
  const contentFig = ui.fig.family;
  let dataset = ui.mget(_a.dataset) || {};
  const email = Skeletons.Box.X({
    className: `${contentFig}__wrapper email`,
    sys_pn: 'wrapper-ident"',
    dataset,
    kids: [
      Skeletons.Box.Y({
        className: `${contentFig}__row email`,
        kids: [
          Skeletons.Button.Svg({
            ico: "profile-signup",
            className: `${contentFig}__icon email input-wrapper profile-signup`,
          }),

          Skeletons.EntryBox({
            value: ui.currentUsername,
            className: `${contentFig}__entry email with-icon`,
            sys_pn: "ref-ident",
            placeholder: LOCALE.EMAIL,
            mode: _a.commit,
            preselect: 1,
            onlyKeyboard: 1,
            service: _e.submit,
            uiHandler: [ui],
            errorHandler: [ui],
            showError: false,
          }),
        ],
      }),
    ],
  });

  const cn = `${contentFig}__wrapper password ${ui.fig.group}__row ${ui.fig.family}__row`;
  const password = Skeletons.Box.X({
    className: `${contentFig}__wrapper password`,
    kids: [require("../../skeleton/password").default(ui)],
  });

  const submit = require("../../skeleton/common/button").default(
    ui,
    _e.submit,
    LOCALE.LOGIN
  );
  const msgBox = require("../../skeleton/common/message-box").default(ui);
  // let href = `${_K.module.welcome}/signin/org`;
  // let content = LOCALE.LOGIN_OTHER_POD;
  // if (Organization.get("domain_id") > 1) {
  //   let { endpoint } = bootstrap();
  //   href = `${endpoint}${_K.module.welcome}/signin`;
  //   content = LOCALE.LOGIN_PERSONAL_ACCOUNT;
  // }

  let helper = "";
  let create_account = "";

  if (Platform.get("isPublic")) {
    create_account = Skeletons.Note({
      className: `${contentFig}__note no-account helper `,
      content: LOCALE.Q_NO_ACCOUNT,
      dataset,
      href: "#/welcome/signup",
    });
  }

  if (Platform.get("arch") == "cloud") {
    helper = Skeletons.Box.Y({
      className: `${contentFig}__wrapper helper`,
      kids: [
        Skeletons.Box.X({
          className: `${contentFig}__row helper no-background`,
          dataset,
          kids: [
            Skeletons.Note({
              className: `${contentFig}__note forgot-password helper `,
              content: LOCALE.Q_FORGOT_PASSWORD,
              dataset,
              href: "#/welcome/reset",
            }),
            create_account,
          ],
        }),

        // Skeletons.Box.X({
        //   className: `${contentFig}__row company-url helper no-background`,
        //   dataset,
        //   kids: [
        //     Skeletons.Note({
        //       className: `${contentFig}__note helper `,
        //       dataset,
        //       content,
        //       href,
        //     }),
        //   ],
        // }),
      ],
    });
  }

  const a = Skeletons.Box.Y({
    debug: __filename,
    className: `${contentFig}__items content`,
    dataset,
    kids: [email, password, submit, msgBox, helper],
  });

  return a;
}

module.exports = __skl_welcome_signin_content;
