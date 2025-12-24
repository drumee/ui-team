const { badge_logo } = require("builtins/skeleton/toolkit");


module.exports = function (ui) {
  const figname = "topbar";
  const pfx = `${ui.fig.group}`;
  return Skeletons.Box.X({
    className: `${pfx}-${figname}__container`,
    sys_pn: "topbar",
    debug: __filename,
    service: _e.raise,
    kids: [
      badge_logo(ui, "c1"),
      Skeletons.Box.X({
        className: `${pfx}__title forbiden`,
        kids: [
          Skeletons.Note({
            sys_pn: "window-label",
            className: _a.name,
            content: ui.mget(_a.title) || "",
          }),
        ],
      }),
    ],
  });
  // const figname = "topbar";
  // return Skeletons.Box.X({
  //   className: `${ui.fig.family}-${figname}__container u-jc-sb`,
  //   sys_pn: "browser-top-bar",
  //   debug: __filename,
  //   service: _e.raise,
  //   kids: [
  //     require('window/skeleton/topbar/control')(ui, 'c')
  //   ]
  // });
};
