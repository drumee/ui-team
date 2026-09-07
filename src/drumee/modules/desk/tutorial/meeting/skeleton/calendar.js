/**
 * THE WEEK, AS THE MEET CAROUSEL'S SECOND CARD SHOWS IT — Figma 149:44974.
 *
 * This was assets/tutorial/meet-schedule.png. It is composed here because
 * every part of that frame is something this codebase draws: the plate and the
 * window chrome are the workspace preview's (../../skeleton/toolkit/
 * app-preview), and the week itself is a grid, a toolbar and five event cards.
 *
 * WHAT IS MEASURED OFF THE FRAME, and what is derived from it. The frame is
 * 762x515 and its window starts at 71,69, which is the plate the other cards
 * use. Inside it an hour row is 74 image-px and a day column 117; at the 0.62
 * that plate renders at, that is 119 and 189 in window pixels. The five
 * meetings are then placed by TIME rather than by pixel — the times below are
 * what those measurements come to, and letting the grid position them is what
 * keeps the card honest if a row height ever changes.
 *
 * Scenery: no service, no sys_pn. The carousel owns every control on that
 * screen.
 */

const { appPreview } = require('../../skeleton/toolkit/app-preview');

const pfx = (ui) => `${ui.fig.group}__mc`;

// The week the frame shows. Sample data, so these are literals rather than
// locale keys — the same treatment the chat tour's fixture gets.
const DAYS = [
  ['07', 'Sunday'], ['08', 'Monday'], ['09', 'Tuesday'], ['10', 'Wednesday'],
  ['11', 'Thursday'], ['12', 'Friday'], ['13', 'Saturday'],
];

// 8 AM is the top of the grid, which is what fixes every event's offset.
const FIRST_HOUR = 8;
const HOURS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM'];

// One window pixel per... no: these ARE window pixels, and the plate shrinks
// them. 74 and 117 image-px at 0.62.
// The card shows 691 image-px of window (762 less the plate's 71px inset), and
// the plate renders at 0.62 — so this is the whole of what a viewer ever sees.
const WINDOW_W = Math.round(691 / 0.62);

const ROW_H = 119;
const COL_W = 189;
const GUTTER_W = 90;

/**
 * `day` is a column index (0 = Sunday 07), `from`/`to` are minutes past
 * midnight. Read off the frame: its cards start 4px below their hour line and
 * stop short of the next one, which is what these times come to.
 */
const EVENTS = [
  { day: 1, from: 9 * 60, to: 10 * 60,
    title: 'Weekly Team Sync', desc: 'Review weekly progress, priorities and blockers' },
  { day: 4, from: 9 * 60 + 30, to: 10 * 60,
    title: 'Sprint review', desc: 'Walk through sprint 1 deliverables and open risks' },
  { day: 4, from: 10 * 60, to: 10 * 60 + 45,
    title: 'Budget Planning Meeting', desc: 'Review budgets, expenses and next-quarter forecasts' },
  { day: 2, from: 10 * 60 + 15, to: 10 * 60 + 45,
    title: 'Project Kick-off Meeting', desc: 'Introduce the project goals, timeline and roles' },
  { day: 2, from: 11 * 60, to: 11 * 60 + 30,
    title: 'Client Feedback Session', desc: 'Gather client feedback and discuss changes' },
];

/** `< Today >` and the range on the left, the Weekly switch on the right. */
function toolbar(ui) {
  const p = pfx(ui);
  const caret = (ico) =>
    Skeletons.Image.Svg({ active: 0, ico, className: `${p}-tb-caret` });
  return Skeletons.Box.X({ active: 0,
    className: `${p}-toolbar`,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${p}-today`,
        kids: [caret('caret-left'), Skeletons.Note({ active: 0,
          className: `${p}-today-label`, content: LOCALE.TODAY }), caret('caret-right')],
      }),
      Skeletons.Box.X({ active: 0,
        className: `${p}-range`,
        kids: [
          Skeletons.Note({ active: 0, className: `${p}-range-label`, content: 'June 07-13, 2026' }),
          caret('ph-caret-down'),
        ],
      }),
      // Right-aligned by the toolbar's own `margin-left: auto` on this box.
      Skeletons.Box.X({ active: 0,
        className: `${p}-mode`,
        kids: [
          Skeletons.Note({ active: 0, className: `${p}-mode-label`, content: LOCALE.WEEKLY }),
          Skeletons.Box.Y({ active: 0,
            className: `${p}-switch`,
            kids: [Skeletons.Box.Y({ active: 0, className: `${p}-switch-knob` })],
          }),
        ],
      }),
    ],
  });
}

/** One event card, placed by its own start and end. */
function event(ui, e) {
  const p = pfx(ui);
  const top = ((e.from - FIRST_HOUR * 60) / 60) * ROW_H;
  const height = ((e.to - e.from) / 60) * ROW_H;
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-event`,
    // styleOpt, which is the channel ui-core reads CSS properties through
    // (letc.js takes `opt.style || opt.styleOpt`). The offset is the whole
    // point of the event, so it cannot live in the stylesheet.
    styleOpt: { top: `${Math.round(top)}px`, height: `${Math.round(height)}px` },
    kids: [
      Skeletons.Note({ active: 0, className: `${p}-event-title`, content: e.title }),
      Skeletons.Note({ active: 0, className: `${p}-event-desc`, content: e.desc }),
    ],
  });
}

/** The header strip, the hour rows, and each day's own event layer. */
function week(ui) {
  const p = pfx(ui);
  return Skeletons.Box.Y({ active: 0,
    className: `${p}-week`,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${p}-head`,
        kids: [
          Skeletons.Box.Y({ active: 0, className: `${p}-head-gutter` }),
          ...DAYS.map(([n, name]) =>
            Skeletons.Box.Y({ active: 0,
              className: `${p}-head-day`,
              kids: [
                Skeletons.Note({ active: 0, className: `${p}-head-num`, content: n }),
                Skeletons.Note({ active: 0, className: `${p}-head-name`, content: name }),
              ],
            }),
          ),
        ],
      }),
      Skeletons.Box.X({ active: 0,
        className: `${p}-body`,
        kids: [
          // The hour labels, one per row, in their own column.
          Skeletons.Box.Y({ active: 0,
            className: `${p}-gutter`,
            kids: HOURS.map((h) =>
              Skeletons.Box.Y({ active: 0,
                className: `${p}-gutter-cell`,
                kids: [Skeletons.Note({ active: 0, className: `${p}-hour`, content: h })],
              }),
            ),
          }),
          // Each day is its own column: the hour cells stack in flow and the
          // events are absolute over them, which is what lets an event start
          // at half past.
          ...DAYS.map((d, i) =>
            Skeletons.Box.Y({ active: 0,
              className: `${p}-col`,
              kids: [
                ...HOURS.map(() => Skeletons.Box.Y({ active: 0, className: `${p}-cell` })),
                ...EVENTS.filter((e) => e.day === i).map((e) => event(ui, e)),
              ],
            }),
          ),
        ],
      }),
    ],
  });
}

/**
 * @param {Object} ui
 * @returns {Object} the plate, with the week on it
 */
function scheduleCard(ui) {
  const p = pfx(ui);
  return appPreview(ui, {
    active: 'meet',
    fit: 'card',
    // THE WINDOW ENDS WHERE THE CARD ENDS, unlike the other previews, whose
    // bodies simply run off the right. This one's toolbar right-aligns the
    // Weekly switch, and the frame puts that switch at the card's own right
    // edge — so the window has to be the visible width and not the plate's
    // default 1280. 691 image-px of card at the plate's 0.62.
    w: WINDOW_W,
    body: Skeletons.Box.Y({ active: 0,
      className: `${p}-pane`,
      kids: [toolbar(ui), week(ui)],
    }),
  });
}

module.exports = { scheduleCard, DAYS, HOURS, EVENTS, ROW_H, COL_W, GUTTER_W, WINDOW_W };
