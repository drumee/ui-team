module.exports = function (ui) {
  const fig = ui.fig.family; // window-info
  // Brand logo only. The X was removed: every caller's action row already
  // carries a dismissing button (Close / Cancel / Got it), so the corner cross
  // was a second way out that only cost the header its padding.
  return Skeletons.Box.X({
    className: `${fig}__topbar`,
    sys_pn: "topbar",
    debug: __filename,
    service: _e.raise,
    kids: [
      Skeletons.Box.X({
        className: `${fig}__logo`,
        kids: [
          Skeletons.Button.Svg({
            ico: "logo-upload",
            className: `${fig}__logo-ico`,
          }),
          Skeletons.Note({
            content: "drumee",
            className: `${fig}__logo-text`,
          }),
        ],
      }),
    ],
  });
};
