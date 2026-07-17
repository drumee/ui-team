// ===========================================================
// Backgrounds & effects panel — opens next to the camera devices-list when
// "Upload Background" is clicked (Figma "blur & personal background").
// Two tiles: Blur Background (toggles blur) and Upload Background (pick a
// custom background image, applied immediately).
//   opt = { current: { type, level, id } }
// ===========================================================
const __webrtc_bg_effects = function (_ui_, opt = {}) {
  const current = opt.current || {};

  // Button.Svg (not Box.X) so the tile dispatches its service on click — the
  // same clickable widget the topbar ctrl buttons use.
  const tile = (svc, ico, extraCls) =>
    Skeletons.Button.Svg(Object.assign(
      {
        className: `bg-effect-tile ${extraCls || ""}`.trim(),
        ico,
        uiHandler: [_ui_],
      },
      svc
    ));

  const isBlur = current.type === "blur";

  const tiles = [
    // Blur background (toggles on/off).
    tile(
      { service: "bg-blur", state: isBlur ? 1 : 0, dataset: { tip: LOCALE.BLUR_BACKGROUND } },
      "sparkle",
      "blur"
    ),
    // Upload a custom background image.
    tile(
      { service: "bg-upload", state: current.type === "image" ? 1 : 0, dataset: { tip: LOCALE.UPLOAD_BACKGROUND } },
      "bg-image",
      "upload"
    ),
  ];

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
