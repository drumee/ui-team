
export default function footer(ui) {
  const fig = `${ui.fig.family}`;

  return Skeletons.Box.X({
    debug: __filename,
    className: `${fig}__footer`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}__footer-action`,
        service: "copy-link",
        uiHandler: [ui],
        kidsOpt: {
          active: 0,
        },
        kids: [
          Skeletons.Button.Svg({
            ico: "copylink",
            className: `${fig}__footer-icon`,
          }),
          Skeletons.Note({
            className: `${fig}__footer-label`,
            content: LOCALE.COPY_LINK || "Copy Link",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${fig}__footer-action`,
        service: "share-qrcode",
        uiHandler: [ui],
        kidsOpt: {
          active: 0,
        },
        kids: [
          Skeletons.Button.Svg({
            ico: "qrcode",
            className: `${fig}__footer-icon`,
          }),
          Skeletons.Note({
            className: `${fig}__footer-label`,
            content: LOCALE.SHOW_QR_CODE || "Show QR code",
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${fig}__footer-action`,
        service: "send-by-email",
        uiHandler: [ui],
        kidsOpt: {
          active: 0,
        },
        kids: [
          Skeletons.Button.Svg({
            ico: "email",
            className: `${fig}__footer-icon`,
          }),
          Skeletons.Note({
            className: `${fig}__footer-label`,
            content: LOCALE.SEND_LINK_BY_EMAIL,
          }),
        ],
      }),
    ],
  });
}
