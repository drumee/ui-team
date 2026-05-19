module.exports = function (ui) {
  const figname = "topbar";
  const pfx = `${ui.fig.group}`;
  return Skeletons.Box.X({
    className: `${pfx}-${figname}__container`,
    sys_pn: "topbar",
    debug: __filename,
    service: _e.raise,
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.family}__logo`,
        kids: [
          Skeletons.Button.Svg({
            ico: "logo-upload",
            className: `${ui.fig.family}__logo-ico`,
          }),
          Skeletons.Note({
            content: "drumee",
            className: `${ui.fig.family}__logo-text`,
          }),
        ],
      }),
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
