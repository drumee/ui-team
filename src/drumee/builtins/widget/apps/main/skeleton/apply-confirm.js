export default function apply_confirm_overlay(ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__apply-overlay`,
    dataset: { state: "open" },
    kids: [
      Skeletons.Box.Y({
        className: `${pfx}__apply-card`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__apply-head`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__apply-head-row`,
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__apply-title`,
                    content:
                      LOCALE.APPLY_RETENTION_NOW ||
                      "Apply retention policy now?",
                  }),
                  Skeletons.Box.X({
                    className: `${pfx}__apply-close`,
                    service: "apps-apply-confirm-close",
                    uiHandler: [ui],
                    kids: [
                      Skeletons.Image.Svg({ ico: "cross", className: `${pfx}__apply-close-ico` }),
                    ],
                  }),
                ],
              }),
              Skeletons.Note({
                className: `${pfx}__apply-body`,
                content:
                  LOCALE.APPLY_RETENTION_BODY ||
                  "Versions older than the selected retention window will be permanently deleted. This cannot be undone.",
              }),
            ],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__apply-actions`,
            kids: [
              Skeletons.Box.X({
                className: `${pfx}__apply-warning`,
                kids: [
                  Skeletons.Image.Svg({
                    ico: "apps-warning",
                    className: `${pfx}__apply-warning-ico`,
                  }),
                  Skeletons.Note({
                    className: `${pfx}__apply-warning-text`,
                    content:
                      LOCALE.APPLY_RETENTION_WARNING ||
                      "Only versions past their natural expiry date will be deleted.",
                  }),
                ],
              }),
              Skeletons.Box.X({
                className: `${pfx}__apply-confirm-btn`,
                service: "apps-apply-confirm-apply",
                uiHandler: [ui],
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__apply-confirm-label`,
                    content: LOCALE.APPLY_CHANGE || "Apply change",
                  }),
                ],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}
