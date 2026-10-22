// The invite link's gate (Figma 1693:168688 in frame 1693:168666; with the
// email step, 1693:168699): the meeting and who shared it, then
//   • "Enter your email to access" — when the organiser ticked "Require email
//     to view" (dmz.login answers REQUIRED_EMAIL, `require_email`), and
//   • "Password required" — when the link has a password (`require_password`),
// each with its own field, one Continue for both, and — when an email is asked
// — "Your email will be shared with the meeting owner." under it.
// dmz.login names the meeting in `filename` (REQUIRED_PASSWORD) or `title`.
function __skl_dmz_meeting_password(ui, data = {}) {
  const pfx = `${ui.fig.family}-password`;
  const sender = String(data.sender || "").trim();
  const askEmail = data.status === "REQUIRED_EMAIL" || !!Number(data.require_email);
  const askPassword =
    data.status === "REQUIRED_PASSWORD" || !!Number(data.require_password) || !!Number(data.require_pwd);

  const section = (ico, title, desc) => [
    Skeletons.Box.X({
      className: `${pfx}__title-row`,
      kids: [
        Skeletons.Image.Svg({ ico, className: `${pfx}__title-ico` }),
        Skeletons.Note({ className: `${pfx}__title`, content: title }),
      ],
    }),
    Skeletons.Note({ className: `${pfx}__desc`, content: desc }),
  ];

  const emailKids = askEmail
    ? [
        ...section("ph-envelope-simple", LOCALE.SECURE_SHARE_ENTER_EMAIL, LOCALE.DMZ_MEETING_EMAIL_REQUIRED),
        Skeletons.EntryBox({
          className: `${pfx}__entry`,
          placeholder: LOCALE.SECURE_SHARE_EMAIL_PLACEHOLDER,
          sys_pn: "ref-email",
          type: "email",
          mode: _a.commit,
          service: "dmz-submit-password",
          uiHandler: [ui],
          partHandler: [ui],
          showError: false,
        }),
      ]
    : [];

  const passwordKids = askPassword
    ? [
        ...section("ph-key", LOCALE.SECURE_SHARE_PASSWORD_REQUIRED, LOCALE.DMZ_MEETING_PASSWORD_PROTECTED),
        Skeletons.EntryBox({
          className: `${pfx}__entry`,
          placeholder: LOCALE.ENTER_PASSWORD,
          sys_pn: "ref-password",
          type: _a.password,
          shower: 1,
          mode: _a.commit,
          service: "dmz-submit-password",
          uiHandler: [ui],
          partHandler: [ui],
          showError: false,
        }),
      ]
    : [];

  return Skeletons.Box.Y({
    className: `${pfx}__card`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__head`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__icon`,
            kids: [Skeletons.Image.Svg({ ico: "meeting-video-solid", className: `${pfx}__icon-svg` })],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__head-text`,
            kids: [
              Skeletons.Note({ className: `${pfx}__name`, content: data.filename || data.title || LOCALE.MEETING }),
              sender
                ? Skeletons.Note({
                    className: `${pfx}__sender`,
                    content: `${LOCALE.SECURE_SHARE_SHARED_BY_PREFIX} ${sender}`,
                  })
                : null,
            ].filter(Boolean),
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__body`,
        attrOpt: { "data-email": askEmail ? "1" : "0", "data-password": askPassword ? "1" : "0" },
        kids: [
          ...emailKids,
          ...passwordKids,
          Skeletons.Note({ className: `${pfx}__error`, sys_pn: "password-error", partHandler: [ui], content: "" }),
          Skeletons.Note({
            className: `${pfx}__button`,
            content: LOCALE.CONTINUE,
            service: "dmz-submit-password",
            uiHandler: [ui],
          }),
          askEmail
            ? Skeletons.Note({ className: `${pfx}__footnote`, content: LOCALE.DMZ_MEETING_EMAIL_SHARED })
            : null,
        ].filter(Boolean),
      }),
    ],
  });
}

module.exports = __skl_dmz_meeting_password;
