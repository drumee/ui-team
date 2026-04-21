module.exports = function (ui) {
  const pfx = ui.fig.family;
  const cards = [
    { ico: 'security', title: LOCALE.COMPLIANCE_SCORE, pn: 'stat-compliance', key: 'compliance_score' },
    { ico: 'user-add', title: LOCALE.PENDING_REQUESTS,  pn: 'stat-pending',    key: 'pending_requests' },
    { ico: 'history',  title: LOCALE.LAST_AUDIT,        pn: 'stat-audit',      key: 'last_audit'       },
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
              Skeletons.Note({ className: `${pfx}__stat-value`, content: ui.mget(c.key) || '—', sys_pn: c.pn }),
            ],
          }),
        ],
      })
    ),
  });
};
