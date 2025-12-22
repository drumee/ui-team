
const __skl_window_confirm_topbar = function (_ui_) {
  const figname = "topbar";
  const pfx = `${_ui_.fig.group}-confirm`;
  return Skeletons.Box.X({
    className: `${pfx}-${figname}__container`,
    sys_pn: "topbar",
    debug: __filename,
    service: _e.raise,
    kids: [
      require("./logo").default(_ui_, "c1"),
      Skeletons.Box.X({
        className: `${pfx}__title forbiden`,
        kids: [
          Skeletons.Note({
            sys_pn: "window-label",
            className: _a.name,
            content: _ui_.mget(_a.title) || "",
          }),
        ],
      }),
    ],
  });
};
module.exports = __skl_window_confirm_topbar;
