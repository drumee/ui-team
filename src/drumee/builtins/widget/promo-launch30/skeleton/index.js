// promo-launch30 — per-state skeleton dispatcher.
module.exports = function (ui) {
  const pfx = ui.fig.family;
  // Literal paths, one per branch — webpack resolves require() statically, so
  // a variable path here would pull the whole directory into a context module.
  const state = ui.getState();
  let body;
  if (state === "welcome") body = require("./welcome")(ui);
  else if (state === "ended") body = require("./ended")(ui);
  else body = require("./offer")(ui);
  return Skeletons.Box.Z({
    className: `${pfx}__backdrop`,
    debug: __filename,
    kids: [body],
  });
};
