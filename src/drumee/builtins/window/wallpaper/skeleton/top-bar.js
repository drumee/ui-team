
const __skl_window_search_topbar = function (ui) {
  const figname = "topbar";
  const a = Skeletons.Box.X({
    className: `${ui.fig.family}-${figname}__container u-jc-sb`,
    sys_pn: "browser-top-bar",
    service: _e.raise,
    debug: __filename,
    kidsOpt: {
      radio: _a.on,
      uiHandler: [ui]
    },
    kids: [
      Skeletons.Box.X({
        className: `${ui.fig.family}-${figname}__title u-ai-center`,
        kids: [
          Skeletons.Box.X({
            className: `${ui.fig.family}-${figname}__title name`,
            sys_pn: "topbar-name",
            kids: [Skeletons.Note('Customize Background', _a.title)]
          })
        ]
      }),
      require('window/skeleton/topbar/control')(ui, 'c')
    ]
  });

  return a;
};
module.exports = __skl_window_search_topbar;
