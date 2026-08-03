/**
 * Step 4 bodies — the folder window with the Tasks tab open, one builder per
 * tracker view.
 *
 * The window chrome (header + Files/Chat/Tasks/Meeting tabs) comes from the
 * shared toolkit, so the tracker sits in the same frame as the folder step. On
 * top of it the tracker adds its own bar: the five-view switcher on the left
 * and the per-view controls the design shows on the right.
 */

const { folderHeader, tabBar } = require('../../skeleton/toolkit');

const VIEWS = [
  { key: 'board', label: 'Board', ico: 'square-split-horizontal', build: require('./board') },
  { key: 'calendar', label: 'Calendar', ico: 'calendar', build: require('./calendar') },
  { key: 'gantt', label: 'Gantt', ico: 'app-task-grant', build: require('./gantt') },
  { key: 'list', label: 'List', ico: 'app-task-list', build: require('./list') },
  { key: 'health', label: 'Project Health', ico: 'app-task-project-health', build: require('./health') },
];

/** Right-hand controls, which differ per view in the design. */
function controls(pfx, view) {
  const btn = (label, ico, extra = '') =>
    Skeletons.Box.X({
      className: `${pfx}__ctl ${extra}`.trim(),
      kids: [
        ico ? Skeletons.Image.Svg({ ico, className: `${pfx}__ctl-icon` }) : null,
        Skeletons.Note({ className: `${pfx}__ctl-label`, content: label }),
      ].filter(Boolean),
    });

  const toggle = (left, right) =>
    Skeletons.Box.X({
      className: `${pfx}__toggle`,
      kids: [
        Skeletons.Note({ className: `${pfx}__toggle-label`, content: left }),
        Skeletons.Box.Y({
          className: `${pfx}__toggle-switch`,
          kids: [Skeletons.Box.Y({ className: `${pfx}__toggle-knob` })],
        }),
        Skeletons.Note({ className: `${pfx}__toggle-label`, content: right }),
      ],
    });

  const kids = [];
  switch (view.key) {
    case 'board':
      kids.push(btn(LOCALE.NEW_BOARD || 'New board', 'topbar-add'));
      break;
    case 'calendar':
      kids.push(toggle(LOCALE.WEEKLY || 'Weekly', LOCALE.MONTHLY || 'Monthly'));
      kids.push(
        Skeletons.Box.X({
          className: `${pfx}__ctl nav`,
          kids: [
            Skeletons.Image.Svg({ ico: 'arrow-left', className: `${pfx}__ctl-icon` }),
            Skeletons.Note({ className: `${pfx}__ctl-label`, content: LOCALE.TODAY || 'Today' }),
            Skeletons.Image.Svg({ ico: 'arrow-right', className: `${pfx}__ctl-icon` }),
          ],
        }),
      );
      break;
    case 'gantt':
      kids.push(toggle(LOCALE.WEEKS || 'Weeks', LOCALE.MONTHS || 'Months'));
      kids.push(btn(LOCALE.DETAIL || 'Detail', 'ctxmenu-info'));
      break;
    case 'health':
      kids.push(btn(LOCALE.DURATION || 'Duration', null, 'caret'));
      break;
    default:
      break;
  }
  kids.push(btn(LOCALE.FILTER || 'Filter', 'meet-sort'));
  return Skeletons.Box.X({ className: `${pfx}__controls`, kids });
}

function switcher(pfx, active) {
  return Skeletons.Box.X({
    className: `${pfx}__switcher`,
    kids: VIEWS.map((v) =>
      Skeletons.Box.X({
        className: `${pfx}__view${v.key === active ? ' active' : ''}`,
        kids: [
          Skeletons.Image.Svg({ ico: v.ico, className: `${pfx}__view-icon` }),
          Skeletons.Note({ className: `${pfx}__view-label`, content: v.label }),
        ],
      }),
    ),
  });
}

/**
 * @param {Object} ui
 * @param {String} key one of VIEWS
 * @returns {Object} the whole window for that view
 */
function screen(ui, key) {
  const pfx = ui.fig.family;
  const view = VIEWS.find((v) => v.key === key) || VIEWS[0];
  const aspect = ui.mget('aspect') || 'normal';
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    dataset: { aspect, view: view.key },
    kids: [
      // The tracker's folder is a shared one in the design — EXTERNAL badge,
      // pink folder (see task/skin __header-icon / __header-restricted).
      folderHeader(ui, pfx, { badge: LOCALE.EXTERNAL || 'EXTERNAL' }),
      tabBar(ui, pfx, { active: 'tasks', meeting: true }),
      Skeletons.Box.X({
        className: `${pfx}__bar`,
        kids: [switcher(pfx, view.key), controls(pfx, view)],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__view-body`,
        kids: [view.build(ui, pfx)],
      }),
    ],
  });
}

module.exports = { VIEWS, screen };
