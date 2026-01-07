
export default function overlay(ui, id) {
  const fig = `${ui.fig.family}__overlay`;

  return Skeletons.Box.Y({
    debug: __filename,
    className: `${fig}-main`,
    kids: [
      Skeletons.Box.Y({
        className: `${fig}-content`,
        kids: [
          Skeletons.Element({
            tagName: "img",
            className: `${fig}-canvas`,
            sys_pn: "qr-code",
            attribute: { id },
          }),
          Skeletons.Note({
            className: `${fig}-button`,
            content: LOCALE.CLOSE,
            uiHandler: [ui],
            service: "close-overlay"
          }),
        ],
      }),
    ],
  });
}
