// The invite link's password gate (Figma 1693:168688, in frame 1693:168666):
// the meeting and who shared it, "Password required", the password field and
// Continue. dmz.login answers REQUIRED_PASSWORD with the meeting's title in
// `filename`. The frame's "Your email will be shared with the meeting owner"
// line is left out: this gate asks for no email.
function __skl_dmz_meeting_password(ui, data = {}) {
  const pfx = `${ui.fig.family}-password`;
  const sender = String(data.sender || "").trim();
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
              Skeletons.Note({ className: `${pfx}__name`, content: data.filename || LOCALE.MEETING }),
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
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__title-row`,
            kids: [
              Skeletons.Image.Svg({ ico: "ph-key", className: `${pfx}__title-ico` }),
              Skeletons.Note({ className: `${pfx}__title`, content: LOCALE.SECURE_SHARE_PASSWORD_REQUIRED }),
            ],
          }),
          Skeletons.Note({ className: `${pfx}__desc`, content: LOCALE.DMZ_MEETING_PASSWORD_PROTECTED }),
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
          Skeletons.Note({ className: `${pfx}__error`, sys_pn: "password-error", partHandler: [ui], content: "" }),
          Skeletons.Note({
            className: `${pfx}__button`,
            content: LOCALE.CONTINUE,
            service: "dmz-submit-password",
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });
}

module.exports = __skl_dmz_meeting_password;
