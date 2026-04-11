const __button = function (ui, k) {
  const a = {
    f: require("./fullscreen")(ui),
    v: require("./representation")(ui),
    s: require("./sizing")(ui),
    c: require("./close")(ui),
    m: require("./minimize").default(ui),
  };
  return a[k] || Skeletons.Box.X(ui);
};

module.exports = function (ui, mode) {
  const cnWidowButton = "window-button";
  if (mode == null) {
    mode = "vmsc";
  }
  const a = Skeletons.Box.X({
    debug: __filename,
    // className : `${ui.fig.group}-topbar__control ${ui.fig.family}-topbar__control`,
    className: `${cnWidowButton}__icon-button`,

    kids: [],
  });

  const m = new RegExp(`[${mode}]`);
  for (var n of Array.from(mode.split(""))) {
    if (m.test(n)) {
      a.kids.push(__button(ui, n));
    }
  }

  return a;
};
