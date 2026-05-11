module.exports = function (ui) {
  const pfx = `${ui.fig.family}-topbar`;
  let visibility = 0;
  let state = 0;
  if (ui.mget('pin')) {
    state = 1;
    visibility = 1;
  }
  if (ui.media) {
    ({ visibility: 1 });
  }
  return Skeletons.Box.X({
    debug: __filename,
    sys_pn: "container-action",
    className: `${pfx}__action`,
    service: _e.raise,
    kids: [
      Skeletons.Button.Svg({
        ico: "floppy",
        service: _e.save,
        className: `${ui.fig.family}-topbar__icon save`,
        haptic: 1000
      }),
      Skeletons.Button.Svg({
        ico: "drumee-tools_pin",
        service: "pin-on",
        state,
        sys_pn: "pin",
        className: `${ui.fig.family}-topbar__icon pin`,
        tooltips: LOCALE.PIN_ON_DESK,
        haptic: 1000,
        dataset: {
          visibility
        }
      })
    ]
  });
};
