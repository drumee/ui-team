
module.exports = function (ui) {
  return Skeletons.Box.Y({
    debug: __filename,
    className: `${ui.fig.family}__main`,
    sys_pn: "image-box",
    partHandler: ui,
    active: ui.mget(_a.active)
  });
};
