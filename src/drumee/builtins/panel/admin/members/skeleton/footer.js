module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.X({
    className: `${pfx}__footer`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__remove-selected`,
        content: LOCALE.REMOVE_SELECTED,
        service: 'remove-selected',
        uiHandler: [ui],
      }),
      Skeletons.Box.X({
        className: `${pfx}__pagination`,
        sys_pn: 'pagination',
        kids: [
          Skeletons.Button.Svg({ className: `${pfx}__page-arrow prev`, ico: 'arrow-left',  service: 'prev-page',  uiHandler: [ui] }),
          Skeletons.Box.X({ className: `${pfx}__page-nums`, sys_pn: 'page-nums' }),
          Skeletons.Button.Svg({ className: `${pfx}__page-arrow next`, ico: 'arrow-right', service: 'next-page',  uiHandler: [ui] }),
        ],
      }),
    ],
  });
};
