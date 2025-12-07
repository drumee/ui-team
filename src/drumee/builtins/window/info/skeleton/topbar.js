
module.exports = function (_ui_) {
  const figname = "topbar";
  return Skeletons.Box.X({
    className: `${_ui_.fig.family}-${figname}__container u-jc-sb`,
    sys_pn: "browser-top-bar",
    debug: __filename,
    service: _e.raise,
    kids: [
      require('window/skeleton/topbar/control')(_ui_, 'c')
    ]
  });
};
