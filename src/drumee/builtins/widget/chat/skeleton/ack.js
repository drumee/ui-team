// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *

/**
 * Compact "copied to clipboard" toast for the chat panel.
 *
 * Replaces @drumee/ui-core/letc/preset/ack, which led with the Drumee mascot
 * avatar and rendered wrong here for two independent reasons:
 *
 *   - the mascot fills from a linearGradient whose stops are named after the
 *     CALLING widget's fig.family. Those stops are only ever styled for
 *     `window-manager` (modules/desk/wm/skin), so under `widget-chat` they
 *     carried no stop-color and SVG fell back to black — the black blob in
 *     the report;
 *   - the preset names its icon wrapper `<family>__acknowledge-icon`, which
 *     the chat skin's `.preset-acknowledge__container .icon` rule never
 *     matched, so nothing constrained the mascot's size either.
 *
 * Built like ./error — the sibling toast that always rendered correctly in
 * the same wrapper — as a plain `.icon` + `.text` pair the chat skin styles
 * directly. Box.X so the two sit on one row; the framework owns flex
 * direction, so the skin never sets it.
 */
const __chat_acknowledge = function (_ui_, text, icon, style, ext) {
  if (icon == null) { icon = ''; }
  if (ext == null) { ext = {}; }
  const figName = ext.presetClass || "preset-acknowledge";

  const ackIcon = icon || 'chat-action-check';

  const a = Skeletons.Box.Y({
    className: `${figName}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.X({
        className: `${figName}__container`,
        kids: [
          Skeletons.Image.Svg({
            ico: ackIcon,
            className: "icon"
          }),
          Skeletons.Note({
            content: text,
            className: "text"
          })
        ]
      })
    ]
  });
  if (style != null) {
    _.merge(a.styleOpt, style);
  }
  return a;
};
module.exports = __chat_acknowledge;
