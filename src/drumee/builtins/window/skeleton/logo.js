module.exports = function (ui) {
  const ico = `raw-badge-${ui.mget(_a.area)}`;
  const cnWidowTopbarTitle = "window-topbar-title";

  return Skeletons.Button.Svg({
    ico,
    className: `${cnWidowTopbarTitle}__logo`,
    uiHandler: ui,
  });
};
