// ===========================================================
// Backgrounds & effects panel — opens next to the camera devices-list when
// "Upload Background" is clicked (Figma "blur & personal background").
// Tiles: Blur Background (toggles blur), Upload Background (pick a custom
// image), then one preview tile per uploaded background image.
//   opt = { current: { type, level, id }, backgrounds: [{ id, url }] }
// ===========================================================
const __webrtc_bg_effects = function (_ui_, opt = {}) {
  const current = opt.current || {};
  const backgrounds = opt.backgrounds || [];

  // Button.Svg (not Box.X) so the icon tile dispatches its service on click —
  // the same clickable widget the topbar ctrl buttons use.
  const iconTile = (svc, ico, extraCls) =>
    Skeletons.Button.Svg(Object.assign(
      {
        className: `bg-effect-tile ${extraCls || ""}`.trim(),
        ico,
        uiHandler: [_ui_],
      },
      svc
    ));

  // Image preview tile: a Box.X that dispatches "bg-select" on click. The <img>
  // is active:0 so the click bubbles to the box; the close badge stays active
  // with its own "bg-remove" service (its stopPropagation keeps bg-select from
  // also firing), and shows on hover to remove the background from the row.
  const imageTile = (bg) =>
    Skeletons.Box.X({
      className: "bg-effect-tile thumb",
      service: "bg-select",
      uiHandler: [_ui_],
      dataset: { bgId: bg.id },
      state: current.type === "image" && current.id === bg.id ? 1 : 0,
      kids: [
        Skeletons.Element({
          tagName: _K.tag.img,
          attrOpt: { src: bg.url, alt: "" },
          active: 0,
        }),
        Skeletons.Button.Svg({
          className: "bg-thumb-close",
          ico: "cross",
          service: "bg-remove",
          dataset: { bgId: bg.id },
          uiHandler: [_ui_],
          attrOpt: { title: LOCALE.DELETE || "Remove" },
        }),
      ],
    });

  const isBlur = current.type === "blur";

  const tiles = [
    // Blur background (toggles on/off).
    iconTile(
      { service: "bg-blur", state: isBlur ? 1 : 0, dataset: { tip: LOCALE.BLUR_BACKGROUND } },
      "sparkle",
      "blur"
    ),
    // Preview tiles for each uploaded background — always before the upload
    // (add) tile, so the "+" stays at the end of the row.
    ...backgrounds.map(imageTile),
    // Upload a custom background image (the "add" tile).
    iconTile(
      { service: "bg-upload", dataset: { tip: LOCALE.UPLOAD_BACKGROUND } },
      "bg-image",
      "upload"
    ),
  ];

  return Skeletons.Box.Y({
    className: "bg-effects-panel",
    kids: [
      Skeletons.Box.X({
        className: "bg-effects-header",
        kids: [
          Skeletons.Note({
            className: "bg-effects-title",
            content: LOCALE.BLUR_AND_BACKGROUND || "Blur effects and personal background",
          }),
          Skeletons.Button.Svg({
            className: "bg-effects-close",
            ico: "cross",
            service: "close-bg-effects",
            uiHandler: [_ui_],
            attrOpt: { title: LOCALE.CLOSE || "Close" },
          }),
        ],
      }),
      Skeletons.Box.X({ className: "bg-effects-row", kids: tiles }),
    ],
  });
};
module.exports = __webrtc_bg_effects;
