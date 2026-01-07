
module.exports = function (ui, text, style, ext) {
  if (ext == null) { ext = {}; }
  const figName = ext.presetClass || "preset-acknowledge";
  const a = Skeletons.Box.Y({
    className: `${figName}__main`,
    debug: __filename,
    kids: [
      Skeletons.Box.Y({
        className: `${figName}__container`,
        kids: [
          Skeletons.Button.Svg({
            ico: "logo",
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
    a.styleOpt = {...a.styleOpt, ...style}
  }
  return a;
};