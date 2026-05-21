module.exports = function (ui) {
  const fig = ui.fig.family;
  return Skeletons.Box.X({
    className: `${fig}__layout`,
    kids: [
      require('./sidebar')(ui),
      Skeletons.Box.Y({
        className: `${fig}__main`,
        kids: [
          require('./topbar')(ui),
          Skeletons.Box.Y({
            className: `${fig}__content`,
            sys_pn: _a.content,
            kids: [
              { kind: 'tutorial_workspace', service: "next-step", uiHandler: [ui] },
            ]
          })
        ],
      }),
      { kind: 'tutorial_spotlight', sys_pn: 'spotlight', partHandler: ui },
    ],
  });
};
