/**
 * In-Inbox viewer for a chat image / video.
 *
 * The Inbox is a full-canvas screen in the desk's settings-main-slot, which
 * stacks ABOVE every window-manager layer — so the regular viewer, which
 * Wm.openContent launches into those layers, opened behind it: nothing
 * appeared, and the viewers piled up unseen until the user left the Inbox
 * (the "duplicated images" in the workspace chat). This one is drawn inside
 * the Inbox itself. See chat_p2p.previewMedia.
 *
 * @param {View} ui       the chat_p2p widget
 * @param {Object} media  { type, name, slide, orig, position, hasPrev, hasNext }
 */
module.exports = function (ui, media) {
  const fig = ui.fig.family;
  const { type, name, slide, orig, position, hasPrev, hasNext } = media;

  // Previous / next through the conversation's pictures. Always laid out (an
  // inert spacer at an end) so the picture does not shift as you step.
  const stepBtn = (dir, enabled) =>
    enabled
      ? Skeletons.Button.Svg({
          ico: dir === "prev" ? "arrow-left" : "arrow-right",
          className: `${fig}__lightbox-step ${dir}`,
          service: `lightbox-${dir}`,
          uiHandler: [ui],
        })
      : Skeletons.Box.X({ className: `${fig}__lightbox-step ${dir} idle` });

  const content =
    type === _a.video
      ? Skeletons.Element({
          tagName: _a.video,
          className: `${fig}__lightbox-video`,
          sys_pn: "lightbox-video",
          attribute: {
            src: orig,
            poster: slide,
            controls: "",
            autoplay: "",
            playsinline: "",
          },
        })
      : Skeletons.Element({
          tagName: "img",
          className: `${fig}__lightbox-img`,
          sys_pn: "lightbox-img",
          // data-orig in `attribute`, not `dataset`: a skeleton dataset is
          // dropped at render unless an attribute map rides with it.
          attribute: { src: slide, alt: "", draggable: "false", "data-orig": orig },
        });

  return Skeletons.Box.Y({
    className: `${fig}__lightbox-main`,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__lightbox-bar`,
        kids: [
          Skeletons.Note({
            className: `${fig}__lightbox-name`,
            content: name || "",
          }),
          position
            ? Skeletons.Note({
                className: `${fig}__lightbox-position`,
                content: position,
              })
            : null,
          Skeletons.Button.Svg({
            ico: "download",
            className: `${fig}__lightbox-btn`,
            service: "lightbox-download",
            tooltips: { content: LOCALE.DOWNLOAD, className: `${fig}__lightbox-tip` },
            uiHandler: [ui],
          }),
          Skeletons.Button.Svg({
            ico: "account_cross",
            className: `${fig}__lightbox-btn`,
            service: "lightbox-close",
            tooltips: { content: LOCALE.CLOSE, className: `${fig}__lightbox-tip` },
            uiHandler: [ui],
          }),
        ].filter(Boolean),
      }),
      // A click on the dim stage closes; the picture / video itself is a kid
      // that keeps its own clicks (an active widget stops them), so looking at
      // it — or using the video's controls — does not.
      Skeletons.Box.X({
        className: `${fig}__lightbox-body`,
        kids: [
          stepBtn("prev", hasPrev),
          Skeletons.Box.X({
            className: `${fig}__lightbox-stage`,
            sys_pn: "lightbox-stage",
            service: "lightbox-close",
            uiHandler: [ui],
            kids: [content],
          }),
          stepBtn("next", hasNext),
        ],
      }),
    ],
  });
};
