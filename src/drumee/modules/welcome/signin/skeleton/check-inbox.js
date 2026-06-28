/**
 * Inline check-inbox view shown after the forgot-password form is submitted.
 * Returns { header, content } so it plugs into the shared signin card chrome
 * via this._skeleton() — mirrors ./auth.js. Tells the user a reset link was
 * emailed, with a resend button (on a countdown cooldown — see ../index.js,
 * which re-requests the link via SERVICE.butler.get_reset_token) and a
 * "Log in now" link back to sign in.
 */
function __skl_welcome_signin_check_inbox(ui) {
  const fig = ui.fig.family;
  const dataset = ui.mget(_a.dataset) || {};
  const email = ui.mget(_a.email) || "";

  const header = Skeletons.Box.Y({
    className: `${fig}__header-content`,
    dataset,
    kids: [
      Skeletons.Note({
        className: `${fig}__note header`,
        content: LOCALE.CHECK_YOUR_INBOX || "Check your inbox",
        dataset,
      }),
      Skeletons.Note({
        className: `${fig}__note sub-header`,
        content:
          LOCALE.WE_SENT_LINK_TO || "We've sent a password reset link to",
        dataset,
      }),
    ],
  });

  const inboxIcon = Skeletons.Box.X({
    className: `${fig}__inbox-icon`,
    kids: [
      Skeletons.Button.Svg({ ico: "app-mail", className: `${fig}__envelope` }),
    ],
  });

  const emailLine = Skeletons.Note({
    className: `${fig}__inbox-email`,
    content: email,
  });

  const resend = require("../../skeleton/common/button").default(
    ui,
    "resend-email",
    LOCALE.RESEND_EMAIL || "Resend email",
  );
  const msgBox = require("../../skeleton/common/message-box").default(ui);

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

  const notes = Skeletons.Box.Y({
    className: `${fig}__inbox-footer`,
    kids: [
      Skeletons.Note({
        className: `${fig}__inbox-note`,
        content: LOCALE.LINK_EXPIRES_NOTE || "Link expires in 1 hour.",
      }),
      Skeletons.Note({
        className: `${fig}__inbox-note`,
        content:
          LOCALE.CHECK_SPAM_NOTE ||
          "Check your spam folder if you don't see it.",
      }),
    ],
  });

  const content = Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}__items content check-inbox`,
    dataset,
    kids: [inboxIcon, emailLine, resend, msgBox, backRow, notes],
  });

  return { header, content };
}

module.exports = __skl_welcome_signin_check_inbox;
