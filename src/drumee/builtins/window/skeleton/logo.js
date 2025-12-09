
module.exports = function (ui) {
  const ico = `raw-badge-${ui.mget(_a.area)}`
  return Skeletons.Box.X({
    className: `${ui.fig.family}__logo`,
    kids: [
      Skeletons.Button.Svg({
        ico,
        className: `${ui.fig.family}__icon logo`,
        uiHandler: ui,
      }),
    ],
  });
};
