
const __invitation_searchbox_main = function (ui) {
  const size = ui.size || {};
  const search_box = {
    kind: KIND.search,
    flow: _a.x,
    className: `${ui.fig.family}__input--inline`,
    placeholder: ui.mget(_a.placeholder) || LOCALE.CNAME,
    listClass: "found-box",
    justify: _a.left,
    sys_pn: "ref-searchbox",
    uiHandler: [ui],
    partHandler: [ui],
    api: ui.getApi(),
    mode: _a.interactive,
    service: "items-found",
    vendorOpt: {
      mode: _a.interactive,
      preselect: ui.mget(_a.preselect) || 0,
      name: "key"
    }
  };
  if (ui.mget(_a.preselect) === 0) {
    delete search_box.vendorOpt.preselect;
  }

  let show_all = Skeletons.Button.Svg({
    service: "show-all",
    uiHandler: ui,
    ico: "desktop_contactbook",
    sys_pn: "ctrl-show-all",
    state: 0,
    icons: [
      'desktop_contactbook',
      'desktop_plus'
    ],
    className: `${ui.fig.family}__icon ${ui.fig.group}__icon`
  });

  if (!ui.mget('contactbook')) {
    show_all = { kind: KIND.wrapper };
  }

  const a = [
    Skeletons.Box.Y({
      className: `${ui.fig.family}__main ${ui.fig.name}__main`,
      kids: [
        Skeletons.Box.X({
          kids: [search_box, show_all]
        })
      ]
    }),
    Skeletons.Wrapper.Y({
      name: "tooltips",
      part: ui,
      className: `${ui.fig.family}__tooltips`
    }),
    require("./results")(ui)
  ];
  a.plug(_a.debug, __filename);
  return a;
};
module.exports = __invitation_searchbox_main;
