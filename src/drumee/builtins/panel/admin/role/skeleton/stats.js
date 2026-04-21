module.exports = function (ui) {
  const pfx = ui.fig.family;
  const cards = [
    { ico: 'security',    title: LOCALE.COMPLIANCE_SCORE,   value: ui.mget('compliance_score')   || '—', pn: 'stat-compliance' },
    { ico: 'user-add',    title: LOCALE.PENDING_REQUESTS,   value: ui.mget('pending_requests')   || '—', pn: 'stat-pending'    },
    { ico: 'history',     title: LOCALE.LAST_AUDIT,         value: ui.mget('last_audit')         || '—', pn: 'stat-audit'      },
  ];
  return Skeletons.Box.X({
    className: `${pfx}__stats`,
    kids: cards.map((c) =>
      Skeletons.Box.X({
        className: `${pfx}__stat-card`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__stat-icon-wrap`,
            kids: [Skeletons.Image.Svg({ ico: c.ico, className: `${pfx}__stat-icon` })],
          }),
          Skeletons.Box.Y({
            className: `${pfx}__stat-info`,
            kids: [
              Skeletons.Note({ className: `${pfx}__stat-title`, content: c.title }),
              Skeletons.Note({ className: `${pfx}__stat-value`, content: c.value, sys_pn: c.pn }),
            ],
          }),
        ],
      })
    ),
  });
};
