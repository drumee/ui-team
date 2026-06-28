function __skl_welcome_signin_content(ui) {
  const contentFig = ui.fig.family;
  const dataset = ui.mget(_a.dataset) || {};
  const isReconnect = dataset.mode == "reconnect";

  const emailField = Skeletons.Box.Y({
    className: `${contentFig}__entry-main`,
    dataset,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__entry-label`,
        content: LOCALE.EMAIL.toUpperCase(),
      }),
      Skeletons.Box.X({
        className: `${contentFig}__entry-row`,
        kids: [
          Skeletons.Button.Svg({
            ico: "app-mail",
            className: `${contentFig}__entry-ico`,
          }),
          Skeletons.EntryBox({
            value: ui.currentUsername,
            className: `${contentFig}__entry-input`,
            sys_pn: "ref-ident",
            placeholder: LOCALE.ENTER_YOUR_EMAIL,
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

  const passwordField = Skeletons.Box.Y({
    className: `${contentFig}__entry-main`,
    dataset,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__entry-label`,
        content: LOCALE.PASSWORD.toUpperCase(),
      }),
      Skeletons.Box.X({
        className: `${contentFig}__entry-row`,
        kids: [
          Skeletons.EntryBox({
            type: _a.password,
            className: `${contentFig}__entry-input`,
            sys_pn: "ref-password",
            name: _a.password,
            placeholder: LOCALE.ENTER_YOUR_PASSWORD,
            mode: _a.commit,
            service: _e.submit,
            uiHandler: [ui],
          }),
          Skeletons.Button.Svg({
            ico: "eye_closed",
            className: `${contentFig}__entry-eye-toggle`,
            service: "toggle-password-visibility",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });

  // In-form "Forgot password?" link. Opens the inline forgot-password view
  // (see ../index.js -> showForgot). Gated to cloud installs, which is where
  // the reset-link email backend (butler.get_reset_token) is available.
  const forgotRow =
    Platform.get("arch") == "cloud"
      ? Skeletons.Box.X({
          className: `${contentFig}__forgot-row`,
          kids: [
            Skeletons.Note({
              className: `${contentFig}__forgot-link`,
              content: LOCALE.Q_FORGOT_PASSWORD || "Forgot password?",
              service: "reset-password",
              uiHandler: [ui],
            }),
          ],
        })
      : "";

  const submit = require("../../skeleton/common/button").default(
    ui,
    _e.submit,
    LOCALE.LOG_IN_TO_WORKSPACE,
  );
  const msgBox = require("../../skeleton/common/message-box").default(ui);

  const formSection = Skeletons.Box.Y({
    className: `${contentFig}__form-section`,
    dataset,
    kids: [emailField, passwordField, forgotRow, submit, msgBox],
  });

  // Reconnect mode keeps only the form + forgot-password link.
  if (isReconnect) {
    return Skeletons.Box.Y({
      debug: __filename,
      className: `${contentFig}__items content`,
      dataset,
      kids: [formSection],
    });
  }

  const divider = Skeletons.Box.X({
    className: `${contentFig}__divider`,
    kids: [
      Skeletons.Box.X({ className: `${contentFig}__divider-line` }),
      Skeletons.Note({
        className: `${contentFig}__divider-label`,
        content: LOCALE.OR,
      }),
      Skeletons.Box.X({ className: `${contentFig}__divider-line` }),
    ],
  });

  const googleButton = Skeletons.Box.X({
    className: `${contentFig}__social-button google`,
    service: "use-google",
    uiHandler: [ui],
    kids: [
      Skeletons.Button.Svg({
        ico: "logo-google",
        className: `${contentFig}__social-icon google`,
      }),
      Skeletons.Note({
        className: `${contentFig}__social-label`,
        content: LOCALE.CONTINUE_WITH_GOOGLE,
      }),
    ],
  });

  const appleButton = Skeletons.Box.X({
    className: `${contentFig}__social-button apple`,
    service: "use-apple",
    uiHandler: [ui],
    kids: [
      Skeletons.Button.Svg({
        ico: "logo-apple",
        className: `${contentFig}__social-icon apple`,
      }),
      Skeletons.Note({
        className: `${contentFig}__social-label`,
        content: LOCALE.CONTINUE_WITH_APPLEID || "Continue with Apple",
      }),
    ],
  });

  const socialButtons = Skeletons.Box.Y({
    className: `${contentFig}__social-buttons`,
    kids: [googleButton, appleButton],
  });

  const signupPrompt = Platform.get("isPublic")
    ? Skeletons.Box.X({
        className: `${contentFig}__signup-prompt`,
        kids: [
          Skeletons.Note({
            className: `${contentFig}__signup-prompt-text`,
            content: LOCALE.Q_NO_ACCOUNT,
          }),
          Skeletons.Note({
            className: `${contentFig}__signup-prompt-link`,
            content: LOCALE.START_FREE,
            on_click: () => {
              try {
                history.replaceState(null, "", "#/welcome/signup");
              } catch (e) {}
              if (window.Welcome && _.isFunction(Welcome.loadSignup)) {
                Welcome.loadSignup();
              } else {
                location.hash = "#/welcome/signup";
              }
            },
          }),
        ],
      })
    : "";

  // Terms block — matches the signin app's termsAndConditions() structure.
  // Click handlers (see ../index.js) open the privacy / terms routes.
  const termsContainer = Skeletons.Box.X({
    className: `${contentFig}__terms-container`,
    kids: [
      Skeletons.Note({
        className: `${contentFig}__terms-link`,
        content: LOCALE.PRIVACY_POLICY.toUpperCase(),
        service: "see-privacy-terms",
        uiHandler: [ui],
      }),
      Skeletons.Element({
        className: `${contentFig}__terms-dot`,
        content: "•",
      }),
      Skeletons.Note({
        className: `${contentFig}__terms-link`,
        content: (LOCALE.TERM_OF_SERVICE || LOCALE.TERMS_OF_SERVICE).toUpperCase(),
        service: "see-services-terms",
        uiHandler: [ui],
      }),
    ],
  });

  const footer = Skeletons.Box.Y({
    className: `${contentFig}__footer-links`,
    kids: [signupPrompt, termsContainer],
  });

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${contentFig}__items content`,
    dataset,
    kids: [formSection, divider, socialButtons, footer],
  });
}

module.exports = __skl_welcome_signin_content;
