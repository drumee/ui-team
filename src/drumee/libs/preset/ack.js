/*
 * decaffeinate suggestions:
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/main/docs/suggestions.md
 */
// ==================================================================== *
//   Copyright Xialia.com  2011-2019
//   FILE : __dbg_path
//   TYPE : Skelton
// ==================================================================== *
const __preset_acknowledge = function(_ui_, text, style, ext) {
  if (ext == null) { ext = {}; }
  const figName = ext.presetClass || "preset-acknowledge";
  const a = Skeletons.Box.Y({
    className: `${figName}__main`,
    debug : __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${figName}__container`,
        kids: [ 
          Skeletons.Button.Svg({
            ico          : "desktop_check",
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
module.exports = __preset_acknowledge;