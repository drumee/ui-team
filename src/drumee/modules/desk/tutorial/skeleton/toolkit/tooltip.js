const { fileItem } = require("./folder")


/**
 * Shared tutorial badge skeleton.
 *
 * @param {Object} ui          - desk_tutorial widget instance
 * @param {Object} opts
 * @param {string} opts.title
 * @param {string} opts.desc
 * @param {string} opts.badge_text
 * @param {Object} opts.style
 * @param {string} [opts.direction='north'] - which way the connector extends from the card:
 *   north = connector above card (dot at top, points to target above)
 *   south = connector below card (dot at bottom, points to target below)
 *   east  = connector right of card (dot at right, points to target right)
 *   west  = connector left of card (dot at left, points to target left)
 * @param {string} [opts.variant] - card look. Unset keeps the card every step
 *   has always rendered. "figma" is the measured callout card from the Step 2
 *   designs (320px surface, Geist Mono badge); it is opt-in so the steps that
 *   were not part of that redesign stay pixel-identical. Back and Next are
 *   shared by both looks — the buttons are the same on every step.
 * @param {Object} [opts.host] - who receives `end-tour` from the skip control.
 *   Back/Next go to the step widget (`ui`); ending the tour goes to the tour
 *   host, so the six step widgets need no forwarding case of their own.
 * @param {boolean} [opts.done=false] - label the forward button "Done" instead
 *   of "Next →". For the last screen of the last step, where pressing it ends
 *   the tour rather than advancing it; the arrow goes too, as there is nothing
 *   ahead to point at. The service stays `next-step` — only the wording differs.
 */
export function tooltipBadge(ui, { title, desc, badge_text, style, direction = 'north', hide_back = false, variant = null, done = false, host = null }) {
  const fig = ui.fig.family;
  const p = `${ui.fig.group}__s1`;

  const isHorizontal = direction === 'east' || direction === 'west';
  // south/east: card comes first, connector (with dot at far end) comes second
  const isReversed = direction === 'south' || direction === 'east';

  const BoxContainer = isHorizontal ? Skeletons.Box.X : Skeletons.Box.Y;
  const BoxConnector = isHorizontal ? Skeletons.Box.X : Skeletons.Box.Y;

  // For reversed: line touches the card, dot is at the far end toward the target.
  // For default:  dot is at the near end (toward the target), line connects to the card.
  const connectorKids = isReversed
    ? [
      Skeletons.Box.Y({ className: `${p}-connector-line`, dataset: { direction } }),
      Skeletons.Box.Y({ className: `${p}-connector-dot` }),
    ]
    : [
      Skeletons.Box.Y({ className: `${p}-connector-dot` }),
      Skeletons.Box.Y({ className: `${p}-connector-line`, dataset: { direction } }),
    ];

  const connector = BoxConnector({
    className: `${p}-connector`,
    kids: connectorKids,
  });

  const card = Skeletons.Box.Y({
    className: `${p}-card`,
    kids: [
      // Header: the step pill on the left, the skip control on the right.
      //
      // `end-tour` is deliberately routed at `host` — tutorial_main — and not at
      // `ui`. Back and Next go to the STEP widget, because only the step knows
      // whether it has another screen; ending the tour is the tour's business,
      // and routing it at the step would mean the same forwarding case copied
      // into all six step files. The spotlight supplies `host` because it is
      // the one object holding a reference to both (see spotlight/index.js).
      // Falls back to `ui` so a caller that supplies no host still gets a
      // control that raises something rather than one that silently does
      // nothing.
      Skeletons.Box.X({
        className: `${p}-header`,
        kids: [
          Skeletons.Box.X({
            className: `${p}-badge`,
            kids: [
              Skeletons.Box.Y({ className: `${p}-badge-dot` }),
              Skeletons.Note({ className: `${p}-badge-text`, content: badge_text }),
            ],
          }),
          // Present on EVERY screen, including the first — `hide_back` removes
          // Back where there is nothing behind it, but there is always
          // something to leave.
          Skeletons.Button.Svg({
            ico: 'cross',
            className: `${p}-skip`,
            tooltips: LOCALE.SKIP_TOUR || 'Skip tour',
            service: 'end-tour',
            uiHandler: [host || ui],
          }),
        ],
      }),
      Skeletons.Note({ className: `${p}-title`, content: title }),
      Skeletons.Note({ className: `${p}-desc`, content: desc }),
      Skeletons.Box.X({
        className: `${p}-footer`,
        kids: [
          // On the very first step there is nothing to go back to: render an
          // empty spacer so `justify-content: space-between` still pushes Next
          // to the right edge.
          hide_back
            ? Skeletons.Box.Y({ className: `${p}-back-spacer` })
            : Skeletons.Note({
              className: `${p}-back`,
              content: `← ${LOCALE.BACK || 'Back'}`,
              service: 'back-step',
              uiHandler: [ui],
            }),
          // `is-done` is not decoration: it is how the spotlight finds this
          // button to mark it pending while the tour's closing write is in
          // flight (see spotlight/index.js busy()). Only the last screen's
          // button ends the tour, so only that one can ever wait on anything.
          Skeletons.Note({
            className: `${p}-next${done ? ' is-done' : ''}`,
            content: done ? (LOCALE.DONE || 'Done') : `${LOCALE.NEXT || 'Next'} →`,
            service: 'next-step',
            uiHandler: [ui],
          }),
        ],
      }),
    ],
  });

  return BoxContainer({
    className: `${p}-tooltip`,
    sys_pn: 'badge-tooltip',
    partHandler: [ui],
    style,
    dataset: variant ? { direction, variant } : { direction },
    kids: isReversed ? [card, connector] : [connector, card],
  });
};

/**
 * Badge anchor: zero-size absolute element; badge overflows to the left
 */
export function tooltip(ui, opt) {
  // 
  return Skeletons.Box.Y({
    className: `${ui.fig.group}__tooltip-anchor ${ui.fig.family}__tooltip-anchor`,
    partHandler: ui,
    kids: [tooltipBadge(ui, opt)],
  })
}


