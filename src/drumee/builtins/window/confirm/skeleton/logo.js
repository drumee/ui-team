function confirm_icon(ui) {
  const pfx = `${ui.fig.family}__icon-bubble`;
  const variant = ui.mget("icon_variant") || "primary";
  const ico = ui.mget("icon") || "raw-logo-drumee-icon";
  return Skeletons.Box.X({
    className: `${pfx} ${pfx}--${variant}`,
    kidsOpt: { active: 0 },
    kids: [
      Skeletons.Image.Svg({
        ico,
        className: `${pfx}-svg`,
      }),
    ],
  });
}

module.exports = confirm_icon;
module.exports.default = confirm_icon;
