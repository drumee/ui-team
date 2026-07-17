// ===========================================================
// Backgrounds & effects panel — opens next to the camera devices-list when
// "Upload Background" is clicked (Figma "blur & personal background").
// A titled row of tiles: none / blur / blur-strong / upload, then one tile per
// uploaded (or preset) background image.
//   opt = { current: { type, level, id }, backgrounds: [{ id, url }] }
// ===========================================================
const __webrtc_bg_effects = function (_ui_, opt = {}) {
  const current = opt.current || {};
  const backgrounds = opt.backgrounds || [];

  const tile = (svc, kids, extraCls) =>
    Skeletons.Box.X(Object.assign(
      {
        className: `bg-effect-tile ${extraCls || ""}`.trim(),
        uiHandler: [_ui_],
        kids,
      },
      svc
    ));

  const svg = (ico) => Skeletons.Image.Svg({ ico });
  const isBlur = current.type === "blur";
  const isImage = current.type === "image";

  const tiles = [
    // No effect (original camera).
    tile(
      { service: "bg-none", state: !current.type || current.type === "none" ? 1 : 0 },
      [svg("meet-camera")],
      "none"
    ),
    // Light blur.
    tile(
      { service: "bg-blur", dataset: { level: "light" }, state: isBlur && current.level !== "strong" ? 1 : 0 },
      [svg("sparkle")],
      "blur"
    ),
    // Strong blur.
    tile(
      { service: "bg-blur", dataset: { level: "strong" }, state: isBlur && current.level === "strong" ? 1 : 0 },
      [svg("sparkle")],
      "blur strong"
    ),
    // Upload a custom background image.
    tile({ service: "bg-upload" }, [svg("bg-image")], "upload"),
  ];

  // Uploaded / preset background thumbnails.
  backgrounds.forEach((bg) => {
    tiles.push(
      tile(
        {
          service: "bg-select",
          dataset: { bgId: bg.id },
          state: isImage && current.id === bg.id ? 1 : 0,
        },
        [Skeletons.Element({ tagName: _K.tag.img, attribute: { src: bg.url } })],
        "thumb"
      )
    );
  });

  return Skeletons.Box.Y({
    className: "bg-effects-panel",
    kids: [
      Skeletons.Note({
        className: "bg-effects-title",
        content: LOCALE.BLUR_AND_BACKGROUND || "Blur effects and personal background",
      }),
      Skeletons.Box.X({ className: "bg-effects-row", kids: tiles }),
    ],
  });
};
module.exports = __webrtc_bg_effects;
