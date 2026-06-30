/**
 * Inline forgot-password view. Returns { header, content } so it plugs into the
 * shared signin card chrome (logo + header slot + content slot) via
 * this._skeleton() — mirrors ./auth.js. Submitting fires the `forgot-submit`
 * service (see ../index.js -> submitForgot), which validates the email and
 * requests a reset link via SERVICE.butler.get_reset_token.
 */
function __skl_welcome_signin_forgot(ui) {
  const fig = ui.fig.family;
  const dataset = ui.mget(_a.dataset) || {};

  const header = Skeletons.Box.Y({
    className: `${fig}__header-content`,
    dataset,
    kids: [
      Skeletons.Note({
        className: `${fig}__note header`,
        content: LOCALE.RESET_PASSWORD_TITLE || "Forgot your password?",
        dataset,
      }),
      Skeletons.Note({
        className: `${fig}__note sub-header`,
        content:
          LOCALE.RESET_PASSWORD_SUBTITLE ||
          "Enter your email and we'll send you a reset link.",
        dataset,
      }),
    ],
  });

  const emailField = Skeletons.Box.Y({
    className: `${fig}__entry-main`,
    dataset,
    kids: [
      Skeletons.Note({
        className: `${fig}__entry-label`,
        content: LOCALE.EMAIL.toUpperCase(),
      }),
      Skeletons.Box.X({
        className: `${fig}__entry-row`,
        kids: [
          Skeletons.Button.Svg({
            ico: "app-mail",
            className: `${fig}__entry-ico`,
          }),
          Skeletons.EntryBox({
            value: ui.mget(_a.username) || ui.currentUsername || "",
            className: `${fig}__entry-input`,
            sys_pn: "ref-ident",
            placeholder: LOCALE.ENTER_YOUR_EMAIL,
            mode: _a.commit,
            preselect: 1,
            onlyKeyboard: 1,
            service: "forgot-input",
            uiHandler: [ui],
            errorHandler: [ui],
            showError: false,
          }),
        ],
      }),
    ],
  });

  const submit = require("../../skeleton/common/button").default(
    ui,
    "forgot-submit",
    LOCALE.SEND_RESET_LINK || "Send me the link",
  );
  const msgBox = require("../../skeleton/common/message-box").default(ui);

  const formSection = Skeletons.Box.Y({
    className: `${fig}__form-section`,
    dataset,
    kids: [emailField, submit, msgBox],
  });

  // "Remember password? Log in now →" — back to the sign-in form.
  const backRow = Skeletons.Box.X({
    className: `${fig}__signup-prompt`,
    kids: [
      Skeletons.Note({
        className: `${fig}__signup-prompt-text`,
        content: LOCALE.REMEMBER_PASSWORD || "Remember password?",
      }),
      Skeletons.Note({
        className: `${fig}__signup-prompt-link`,
        content: LOCALE.LOG_IN_NOW || "Log in now →",
        service: "back-to-signin",
        uiHandler: [ui],
      }),
    ],
  });

  const content = Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__items content forgot`,
    dataset,
    kids: [formSection, backRow],
  });

  return { header, content };
}

module.exports = __skl_welcome_signin_forgot;
