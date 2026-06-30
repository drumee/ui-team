// Generic destructive-action confirmation overlay. Modeled on apply-confirm.js
// but driven by ui._confirmAction ({ title, body, confirmLabel }) so the same
// shell can guard member removal, file-version purges, etc. The pending action
// is run by the widget when "apps-confirm-action-apply" fires.
export default function confirm_action_overlay(ui) {
  const pfx = ui.fig.family;
  const conf = ui._confirmAction || {};
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
                    content: conf.title || LOCALE.CONFIRM_ACTION || "Confirm",
                  }),
                  Skeletons.Box.X({
                    className: `${pfx}__apply-close`,
                    service: "apps-confirm-action-close",
                    uiHandler: [ui],
                    kids: [
                      Skeletons.Image.Svg({ ico: "cross", className: `${pfx}__apply-close-ico` }),
                    ],
                  }),
                ],
              }),
              Skeletons.Note({
                className: `${pfx}__apply-body`,
                content: conf.body || "",
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
                    content: conf.warning || LOCALE.ACTION_CANNOT_BE_UNDONE || "This action cannot be undone.",
                  }),
                ],
              }),
              Skeletons.Box.X({
                className: `${pfx}__apply-confirm-btn`,
                service: "apps-confirm-action-apply",
                uiHandler: [ui],
                kids: [
                  Skeletons.Note({
                    className: `${pfx}__apply-confirm-label`,
                    content: conf.confirmLabel || LOCALE.CONFIRM_ACTION || "Confirm",
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
