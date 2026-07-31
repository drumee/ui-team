// promo-launch30 — per-state skeleton dispatcher.
module.exports = function (ui) {
  const pfx = ui.fig.family;
  const body =
    ui.getState() === "welcome" ? require("./welcome")(ui) : require("./offer")(ui);
  return Skeletons.Box.Z({
    className: `${pfx}__backdrop`,
    debug: __filename,
    kids: [body],
  });
};
