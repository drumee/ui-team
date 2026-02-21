
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
          Skeletons.Element({
            className: `${ui.fig.family}__acknowledge-icon`,
            content: require('libs/reader/profile/templates/avatar').default(ui, '-mascot'),
          }),
          Skeletons.Note({
            content: text,
            className: `${ui.fig.family}__acknowledge-text`,
          })
        ]
      })
    ]
  });
  if (style != null) {
    a.styleOpt = { ...a.styleOpt, ...style }
  }
  return a;
};