/**
 * Shared tutorial step skeleton.
 *
 * @param {Object} ui          - desk_tutorial widget instance
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.desc
 * @param {string} opts.badge_text
 */
module.exports = function (ui, { title, desc, badge_text }) {
  const fig = ui.fig.family;
  const p   = `${fig}__s1`;

  return Skeletons.Box.Y({
    className: `${p}-tooltip`,
    sys_pn: 'step-tooltip',
    partHandler: ui,
    kids: [
      // ── Connector ──────────────────────────────────────────────────────
      Skeletons.Box.Y({
        className: `${p}-connector`,
        kids: [
          Skeletons.Box.Y({ className: `${p}-connector-dot` }),
          Skeletons.Box.Y({ className: `${p}-connector-line` }),
        ],
      }),

      // ── Card ───────────────────────────────────────────────────────────
      Skeletons.Box.Y({
        className: `${p}-card`,
        kids: [
          Skeletons.Box.X({
            className: `${p}-badge`,
            kids: [
              Skeletons.Box.Y({ className: `${p}-badge-dot` }),
              Skeletons.Note({ className: `${p}-badge-text`, content: badge_text }),
            ],
          }),

          Skeletons.Note({ className: `${p}-title`, content: title }),
          Skeletons.Note({ className: `${p}-desc`,  content: desc }),

          Skeletons.Box.X({
            className: `${p}-footer`,
            kids: [
              Skeletons.Note({
                className: `${p}-skip`,
                content: LOCALE.SKIP_TOUR || 'Skip tour',
                service: 'skip-tour',
                uiHandler: [ui],
              }),
              Skeletons.Note({
                className: `${p}-next`,
                content: `${LOCALE.NEXT || 'Next'} →`,
                service: 'next-step',
                uiHandler: [ui],
              }),
            ],
          }),
        ],
      }),
    ],
  });
};
