
const __skl_window_confirm_topbar = function (_ui_) {
  const pfx = `${_ui_.fig.group}-confirm`;
  return Skeletons.Box.X({
    className: `${pfx}-topbar__container`,
    sys_pn: "topbar",
    debug: __filename,
    service: _e.raise,
    kids: [
      require("./logo").default(_ui_, "c1"),
    ],
  });
};
module.exports = __skl_window_confirm_topbar;
