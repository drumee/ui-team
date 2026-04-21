module.exports = function (ui) {
  const pfx = ui.fig.family;

  const stat = (mod, ico, label, valueKey, extraKey, extra, pnValue, pnExtra) =>
    Skeletons.Box.Y({
      className: `${pfx}__stat-card ${mod}`,
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__stat-top`,
          kids: [
            Skeletons.Box.Y({
              className: `${pfx}__stat-icon-wrap`,
              kids: [Skeletons.Image.Svg({ ico, className: `${pfx}__stat-ico` })],
            }),
            Skeletons.Note({ className: `${pfx}__stat-extra ${mod}`, content: ui.mget(extraKey) || extra, sys_pn: pnExtra }),
          ],
        }),
        Skeletons.Note({ className: `${pfx}__stat-label`, content: label }),
        Skeletons.Note({ className: `${pfx}__stat-value ${mod}`, content: ui.mget(valueKey) || '—', sys_pn: pnValue }),
        mod === 'blue'
          ? Skeletons.Box.X({ className: `${pfx}__stat-bar`, kids: [Skeletons.Box.X({ className: `${pfx}__stat-bar-fill`, sys_pn: 'score-bar' })] })
          : Skeletons.Note({ className: `${pfx}__stat-desc`, content: ui.mget(`${valueKey}_desc`) || '' }),
      ],
    });

  return Skeletons.Box.X({
    className: `${pfx}__stats`,
    kids: [
      stat('blue',   'security',    LOCALE.SECURITY_SCORE,   'security_score',   'score_trend',   '+12% vs last week', 'stat-score',   'stat-score-extra'),
      stat('orange', 'warning',     LOCALE.HIGH_RISK_ACTIONS,'high_risk_count',  'high_risk_info', '3 unresolved',      'stat-risk',    'stat-risk-extra'),
      stat('pink',   'cloud-upload',LOCALE.STORAGE_ACTIVITY, 'storage_activity', 'storage_status', 'Optimized',         'stat-storage', 'stat-storage-extra'),
    ],
  });
};
