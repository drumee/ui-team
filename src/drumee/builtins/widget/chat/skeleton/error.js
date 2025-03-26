/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2021
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __preset_acknowledge_error = function(_ui_, text, icon, style, ext) {
  if (icon == null) { icon = ''; }
  if (ext == null) { ext = {}; }
  const figName = ext.presetClass || "preset-acknowledge-error";

  const ackIcon = icon || 'unavailable';

  const a = Skeletons.Box.Y({
    className: `${figName}__main`,
    debug : __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${figName}__container`,
        kids: [ 
          Skeletons.Button.Svg({
            ico          : ackIcon,
            className    : "icon"
          }),
          Skeletons.Note({
            content      : text, 
            className    : "text"
          })
        ]})   
    ]});
  if (style != null) {
    _.merge(a.styleOpt, style);
  }
  return a;
};
module.exports = __preset_acknowledge_error;