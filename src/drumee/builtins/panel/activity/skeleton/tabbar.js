module.exports = function (ui) {
  const pfx = ui.fig.family;

  const tabs = [
    { label: LOCALE.ALL_ACTIVITY, service: 'tab-all',      pn: 'tab-all'      },
    { label: LOCALE.MENTIONS,     service: 'tab-mentions',  pn: 'tab-mentions' },
    { label: LOCALE.SHARES,       service: 'tab-shares',    pn: 'tab-shares'   },
  ];

  return Skeletons.Box.X({
    className: `${pfx}__tabbar`,
    kids: tabs.map((tab, i) =>
      Skeletons.Note({
        className: `${pfx}__tab`,
        content: tab.label,
        service: tab.service,
        sys_pn: tab.pn,
        state: i === 0 ? 1 : 0,
        uiHandler: ui,
        radio:`radio-${ui._id}`
      })
    ),
  });
};
