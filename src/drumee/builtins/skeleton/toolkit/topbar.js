
export function topbar (ui, opt='c') {
  const figname = "topbar";
  return Skeletons.Box.X({
    className: `${ui.fig.family}-${figname}__container u-jc-sb`,
    sys_pn: "browser-top-bar",
    debug: __filename,
    service: _e.raise,
    kids: [
      require('window/skeleton/topbar/control')(ui, opt)
    ]
  });
};
