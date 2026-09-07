/**
 * ONE OF THE FIVE TRACKER VIEWS, as a carousel card.
 *
 * Figma 146:40547 / 40652 / 40677 / 40646 / 40683: a gradient plate with the
 * tracker window sitting on it, offset up and right so the plate reads along
 * the left and bottom edges while the window runs off the other two. The same
 * composition the workspace preview uses (../../skeleton/toolkit/app-preview),
 * and it borrows that plate's classes for exactly that reason.
 *
 * These were five PNGs. They are composed again here, which is where they
 * started: ./board, ./calendar, ./gantt, ./list and ./health have been on disk
 * all along with nothing to style them — the 1.x view skin went when the tour
 * moved onto the 2.0 shell, and the bitmaps took its place. It is restored in
 * ../skin/views.scss.
 *
 * All five draw the SAME dataset (./data), so the board's columns, the
 * calendar's days, the gantt's spans, the list's rows and the health figures
 * cannot disagree with one another the way five screenshots can.
 *
 * Scenery: no service, no sys_pn. The carousel's own controls are outside it.
 */

// The tracker's own view tabs, taken from the product's list rather than
// restated — builtins/window/tasks/skeleton/index.js `viewDefs`, same keys,
// same labels, same icons. A tour that names the tabs differently from the
// panel it is introducing teaches the wrong words.
const VIEWS = [
  { key: 'board', label: () => LOCALE.TASK_VIEW_BOARD, ico: 'square-split-horizontal', build: require('./board') },
  { key: 'calendar', label: () => LOCALE.TASK_VIEW_CALENDAR, ico: 'calendar', build: require('./calendar') },
  // NARROWER, and this is the frame's doing rather than a fudge. The gantt's
  // chart divides the width it is given by its nine days (`pctOf` in
  // ./gantt.js), so how wide a day reads is a function of the window. 146:40677
  // draws days 19px apart against a 185px task aside — the whole chart inside
  // the crop, which is 590 once the card's 0.62 is undone. At 1242 the same
  // nine days spread to 105px each and less than three of them fit.
  { key: 'gantt', label: () => LOCALE.TASK_VIEW_GANTT, ico: 'app-task-grant', build: require('./gantt'), w: 570 },
  // The list needs no width of its own: its columns are fixed, so what decides
  // whether Due date lands inside the crop is their widths — see
  // `__ls-cell[data-col]` in ../skin/views.scss.
  { key: 'list', label: () => LOCALE.TASK_VIEW_LIST, ico: 'app-task-list', build: require('./list') },
  // Its four stat tiles are `flex: 1`, so the window decides how much of the
  // third one the crop reaches. 146:40683 shows three and the edge of a
  // fourth, which is 760.
  { key: 'health', label: () => LOCALE.TASK_VIEW_SUMMARY, ico: 'app-task-project-health', build: require('./health'), w: 760 },
];

// THE SIZE THE FIVE VIEWS WERE DRAWN AT — 1242x700, which is what the 1.x
// window pinned (`__ui { max-width: 1242px; max-height: 700px }` in the skin
// this restores). Every number in ../skin/views.scss is measured against it,
// so composing at anything else re-flows all five: the board's columns are
// `flex: 1`, and in a narrower window four of them squeeze in where the frames
// show two.
//
// The card is far smaller than that, and it is MEANT to be — at 0.62 it shows
// 570x556 of the window and the rest runs off the right and the bottom, which
// is exactly what the frames show.
const WINDOW_W = 1242;
const WINDOW_H = 700;

/**
 * STRIP EVERY PART NAME AND EVERY SERVICE from a built tree.
 *
 * The five builders were written for the 1.x step, where each view WAS the
 * screen and the spotlight pointed into it — so they name parts (`board-card`,
 * `list-body`, `list-focus`) and the step awaited them. Here they are artwork
 * on a carousel card, five of them on screen at once: five `list-body`s would
 * give the step five parts by one name, and the carousel owns every control on
 * that screen anyway.
 *
 * Done here rather than by threading an `inert` flag through all five, because
 * this is a property of the CARD, not of the views — and a flag is something a
 * sixth builder can forget.
 */
function scenery(node) {
  if (!node || typeof node !== 'object') return node;
  delete node.sys_pn;
  delete node.partHandler;
  delete node.service;
  delete node.uiHandler;
  for (const kid of [].concat(node.kids || [])) scenery(kid);
  return node;
}

function switcher(pfx, active) {
  return Skeletons.Box.X({ active: 0,
    className: `${pfx}__bar`,
    kids: [
      Skeletons.Box.X({ active: 0,
        className: `${pfx}__switcher`,
        kids: VIEWS.map((v) =>
          Skeletons.Box.X({ active: 0,
            className: `${pfx}__view${v.key === active ? ' active' : ''}`,
            kids: [
              Skeletons.Image.Svg({ active: 0, ico: v.ico, className: `${pfx}__view-icon` }),
              Skeletons.Note({ active: 0, className: `${pfx}__view-label`, content: v.label() }),
            ],
          }),
        ),
      }),
    ],
  });
}

/**
 * @param {Object} ui
 * @param {String} key one of VIEWS
 * @returns {Object} the plate, with that view on it
 */
function taskPreview(ui, key) {
  const pfx = ui.fig.family;
  const view = VIEWS.find((v) => v.key === key) || VIEWS[0];
  return Skeletons.Box.Y({ active: 0,
    className: `${pfx}__tp-plate`,
    kids: [
      Skeletons.Box.Y({ active: 0,
        className: `${pfx}__tp-viewport`,
        kids: [
          Skeletons.Box.Y({ active: 0,
            className: `${pfx}__tp-scale`,
            style: { width: `${view.w || WINDOW_W}px`, height: `${WINDOW_H}px` },
            dataset: { view: view.key },
            attrOpt: { 'data-view': view.key },
            kids: [
              switcher(pfx, view.key),
              Skeletons.Box.Y({ active: 0,
                className: `${pfx}__view-body`,
                kids: [scenery(view.build(ui, pfx))],
              }),
            ],
          }),
        ],
      }),
    ],
  });
}

module.exports = { taskPreview, VIEWS, WINDOW_W, WINDOW_H };
