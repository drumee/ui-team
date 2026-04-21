module.exports = function (ui) {
  const pfx  = ui.fig.family;
  const from = ui.mget('page_from') || 1;
  const to   = ui.mget('page_to')   || 25;
  const total= ui.mget('total')     || 0;

  return Skeletons.Box.X({
    className: `${pfx}__table-footer`,
    kids: [
      Skeletons.Note({
        className: `${pfx}__showing`,
        content: `${LOCALE.SHOWING || 'Showing'} ${from}-${to} ${LOCALE.OF || 'of'} ${total.toLocaleString()} ${LOCALE.ENTRIES || 'entries'}`,
        sys_pn: 'showing-text',
      }),
      Skeletons.Box.X({
        className: `${pfx}__pager`,
        kids: [
          Skeletons.Button.Svg({ className: `${pfx}__pager-btn prev`, ico: 'arrow-left',  service: 'prev-page', uiHandler: [ui] }),
          Skeletons.Button.Svg({ className: `${pfx}__pager-btn next`, ico: 'arrow-right', service: 'next-page', uiHandler: [ui] }),
        ],
      }),
    ],
  });
};
