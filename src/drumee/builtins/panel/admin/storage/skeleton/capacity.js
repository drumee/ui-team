module.exports = function (ui) {
  const pfx = ui.fig.family;

  const usedTb   = ui.mget('used_tb')    || '—';
  const totalTb  = ui.mget('total_tb')   || '—';
  const utilized = ui.mget('utilized_pct') || 0;
  const docsTb   = ui.mget('docs_tb')    || '—';
  const docsPct  = ui.mget('docs_pct')   || 0;
  const mediaTb  = ui.mget('media_tb')   || '—';
  const mediaPct = ui.mget('media_pct')  || 0;
  const availTb  = ui.mget('avail_tb')   || '—';
  const availPct = ui.mget('avail_pct')  || 0;

  const legendItem = (mod, label, val) =>
    Skeletons.Box.X({
      className: `${pfx}__legend-item`,
      kids: [
        Skeletons.Note({ className: `${pfx}__legend-dot ${mod}` }),
        Skeletons.Box.Y({
          className: `${pfx}__legend-info`,
          kids: [
            Skeletons.Note({ className: `${pfx}__legend-label`, content: label }),
            Skeletons.Note({ className: `${pfx}__legend-val`,   content: val   }),
          ],
        }),
      ],
    });

  return Skeletons.Box.Y({
    className: `${pfx}__capacity-card`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__capacity-header`,
        kids: [
          Skeletons.Note({ className: `${pfx}__capacity-label`, content: LOCALE.TOTAL_WORKSPACE_CAPACITY }),
          Skeletons.Box.X({
            className: `${pfx}__capacity-actions`,
            kids: [
              Skeletons.Button.Svg({
                className: `${pfx}__more-btn`,
                ico: 'options_vert',
                service: 'capacity-options',
                uiHandler: [ui],
              }),
              Skeletons.Button.Label({
                className: `${pfx}__upgrade-btn`,
                label: LOCALE.UPGRADE_PLAN,
                service: 'upgrade-plan',
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__capacity-value`,
        kids: [
          Skeletons.Note({ className: `${pfx}__used-val`,  content: usedTb,  sys_pn: 'used-val'  }),
          Skeletons.Note({ className: `${pfx}__unit-sep`,  content: ' TB / '                      }),
          Skeletons.Note({ className: `${pfx}__total-val`, content: `${totalTb} TB`, sys_pn: 'total-val' }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__trend-header`,
        kids: [
          Skeletons.Note({ className: `${pfx}__trend-label`,  content: LOCALE.CONSUMPTION_TREND }),
          Skeletons.Note({
            className: `${pfx}__utilized-pct`,
            content: `${utilized}% ${LOCALE.UTILIZED}`,
            sys_pn: 'utilized-pct',
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__progress-bar`,
        kids: [
          Skeletons.Box.X({ className: `${pfx}__bar-seg docs`,  styleOpt: { width: `${docsPct}%`  } }),
          Skeletons.Box.X({ className: `${pfx}__bar-seg media`, styleOpt: { width: `${mediaPct}%` } }),
          Skeletons.Box.X({ className: `${pfx}__bar-seg avail`, styleOpt: { width: `${availPct}%` } }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__legend`,
        kids: [
          legendItem('docs',  LOCALE.DOCUMENTS,   `${docsTb} TB (${docsPct}%)`  ),
          legendItem('media', LOCALE.MEDIA_ASSETS, `${mediaTb} TB (${mediaPct}%)`),
          legendItem('avail', LOCALE.AVAILABLE,    `${availTb} TB (${availPct}%)`),
        ],
      }),
    ],
  });
};
