/**
 * The folder's Meeting tab — a week of scheduled meetings.
 *
 * Figma: node 5:75093 ("DRUMEE: Tutorial (Meeting)"). The app behind the
 * callout is a flat bitmap in that frame, so the layout is measured off the
 * 1:1 render: a time gutter under a Sun-Sat day header, hour rows split by a
 * dashed half-hour rule, and meetings drawn as blocks with a #5950FF spine on
 * a #EFEEFF fill.
 *
 * The window chrome (header + Files/Chat/Tasks/Meeting tabs) comes from the
 * shared toolkit, so this lands in the same frame as the folder and tracker
 * screens that run before it — the tour never changes windows, only tabs.
 *
 * Not to be confused with tutorial_meeting, which is the call itself: this is
 * where the call is started from.
 *
 * Visual only — no services. `sched-cal` is the spotlight target and
 * `sched-day` is what the callout is placed against.
 */

const { folderHeader, tabBar } = require('../../skeleton/toolkit');

// The design's window clips the last row at its bottom edge, so 2 PM is half
// visible. That is kept rather than trimmed — a calendar that ends flush would
// read as "this is the whole day", which is the wrong impression.
const HOURS = ['8 AM', '9 AM', '10 AM', '11 AM', '12 AM', '1 PM', '2 PM'];

const DAYS = [
  { date: '07', name: 'Sunday' },
  { date: '08', name: 'Monday' },
  { date: '09', name: 'Tuesday' },
  { date: '10', name: 'Wednesday' },
  { date: '11', name: 'Thursday' },
  { date: '12', name: 'Friday' },
  { date: '13', name: 'Saturday' },
];

// The day the design's connector lands on — the callout is placed against this
// column's header, not the calendar's mid-height.
const FOCUS_DATE = '09';

// `at` and `span` are counted in HALF-HOURS from 8:00, which is the grid's own
// unit and the smallest one the design places anything on: "Sprint review" is
// a single slot, "Weekly Team Sync" two.
const MEETINGS = [
  { date: '08', at: 1, span: 2, title: 'Weekly Team Sync', desc: 'Review weekly progress, priorities and blockers' },
  { date: '12', at: 1, span: 1, title: 'Content Calendar Review', desc: 'Plan and organize upcoming content' },
  { date: '11', at: 2, span: 1, title: 'Sprint review', desc: 'Walk through sprint 1 deliverables' },
  { date: '11', at: 3, span: 2, title: 'Budget Planning Meeting', desc: 'Review budgets, expenses, and forecasts' },
  { date: '13', at: 3, span: 2, title: 'Sprint Retrospective', desc: 'Reflect on the previous sprint' },
  { date: '09', at: 4, span: 2, title: 'Project Kick-off Meeting', desc: 'Introduce the project goals, scope and team' },
  { date: '12', at: 5, span: 1, title: 'Brainstorming Session', desc: 'Generate new ideas and explore directions' },
  { date: '09', at: 6, span: 2, title: 'Client Feedback Session', desc: 'Gather client feedback and revisions' },
  { date: '12', at: 8, span: 2, title: 'Monthly Performance Review', desc: 'Evaluate team performance' },
  { date: '11', at: 10, span: 2, title: 'Product Planning Meeting', desc: 'Define product features, priorities' },
  { date: '08', at: 11, span: 2, title: 'Design Review Meeting', desc: 'Present design concepts and iterations' },
  { date: '09', at: 13, span: 2, title: 'Marketing Strategy Discussion', desc: 'Discuss campaign objectives' },
];

// One half-hour, in px. The hour rows below are two of these; keep it in step
// with $slot in skin/index.scss, which sizes the rules the blocks line up on.
const SLOT = 35;

// ── Toolbar ───────────────────────────────────────────────────────────────────
function toolbar(pfx) {
  const btn = (label, ico, extra = '') =>
    Skeletons.Box.X({
      className: `${pfx}__btn ${extra}`.trim(),
      kids: [
        Skeletons.Image.Svg({ ico, className: `${pfx}__btn-icon` }),
        Skeletons.Note({ className: `${pfx}__btn-label`, content: label }),
      ],
    });

  return Skeletons.Box.X({
    className: `${pfx}__bar`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__bar-left`,
        kids: [
          Skeletons.Box.X({
            className: `${pfx}__nav`,
            kids: [
              Skeletons.Image.Svg({ ico: 'arrow-left', className: `${pfx}__nav-icon` }),
              Skeletons.Note({ className: `${pfx}__nav-label`, content: LOCALE.TODAY || 'Today' }),
              Skeletons.Image.Svg({ ico: 'arrow-right', className: `${pfx}__nav-icon` }),
            ],
          }),
          Skeletons.Box.X({
            className: `${pfx}__range`,
            kids: [
              Skeletons.Note({ className: `${pfx}__range-label`, content: 'June 07-13, 2026' }),
              Skeletons.Image.Svg({ ico: 'meet-caret-down', className: `${pfx}__range-caret` }),
            ],
          }),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__bar-right`,
        kids: [
          // Weekly is the live side, so the knob sits right and the track is
          // filled — the same switch the tracker's Calendar view carries.
          Skeletons.Box.X({
            className: `${pfx}__toggle`,
            kids: [
              Skeletons.Note({ className: `${pfx}__toggle-label`, content: LOCALE.WEEKLY || 'Weekly' }),
              Skeletons.Box.Y({
                className: `${pfx}__toggle-switch`,
                kids: [Skeletons.Box.Y({ className: `${pfx}__toggle-knob` })],
              }),
              Skeletons.Note({ className: `${pfx}__toggle-label`, content: LOCALE.MONTHLY || 'Monthly' }),
            ],
          }),
          Skeletons.Box.Y({ className: `${pfx}__bar-divider` }),
          btn(LOCALE.START_A_MEETING || 'Start a Meeting', 'meeting-video'),
          btn(LOCALE.SCHEDULE || 'Schedule', 'calendar', 'primary'),
        ],
      }),
    ],
  });
}

// ── Calendar ──────────────────────────────────────────────────────────────────
function dayHead(ui, pfx, day) {
  return Skeletons.Box.Y({
    className: `${pfx}__day-head`,
    ...(day.date === FOCUS_DATE ? { sys_pn: 'sched-day', partHandler: ui } : {}),
    kids: [
      Skeletons.Note({ className: `${pfx}__day-num`, content: day.date }),
      Skeletons.Note({ className: `${pfx}__day-name`, content: day.name }),
    ],
  });
}

function meeting(pfx, m) {
  return Skeletons.Box.Y({
    className: `${pfx}__ev`,
    styleOpt: { top: `${m.at * SLOT}px`, height: `${m.span * SLOT}px` },
    kids: [
      Skeletons.Note({ className: `${pfx}__ev-title`, content: m.title }),
      Skeletons.Note({ className: `${pfx}__ev-desc`, content: m.desc }),
    ],
  });
}

/** One day column: the hour rules, then the meetings placed over them. */
function dayColumn(pfx, day) {
  return Skeletons.Box.Y({
    className: `${pfx}__col`,
    kids: [
      ...HOURS.map(() =>
        Skeletons.Box.Y({
          className: `${pfx}__hour`,
          // The dashed half-hour rule the design splits every row with.
          kids: [Skeletons.Box.Y({ className: `${pfx}__half` })],
        }),
      ),
      ...MEETINGS.filter((m) => m.date === day.date).map((m) => meeting(pfx, m)),
    ],
  });
}

function calendar(ui, pfx) {
  return Skeletons.Box.Y({
    className: `${pfx}__cal`,
    sys_pn: 'sched-cal',
    partHandler: ui,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__cal-head`,
        kids: [
          Skeletons.Box.Y({ className: `${pfx}__gutter-head` }),
          ...DAYS.map((d) => dayHead(ui, pfx, d)),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__cal-body`,
        kids: [
          Skeletons.Box.Y({
            className: `${pfx}__gutter`,
            kids: HOURS.map((h) =>
              Skeletons.Box.Y({
                className: `${pfx}__gutter-hour`,
                kids: [Skeletons.Note({ className: `${pfx}__gutter-label`, content: h })],
              }),
            ),
          }),
          ...DAYS.map((d) => dayColumn(pfx, d)),
        ],
      }),
    ],
  });
}

// ── Window ────────────────────────────────────────────────────────────────────
module.exports = function (ui) {
  const pfx = ui.fig.family;
  return Skeletons.Box.Y({
    className: `${pfx}__main`,
    dataset: { aspect: ui.mget('aspect') || 'normal' },
    kids: [
      // The same shared folder the tracker step shows — pink icon, SHARED pill.
      folderHeader(ui, pfx, { badge: LOCALE.SHARED || 'SHARED' }),
      tabBar(ui, pfx, { active: 'meeting', meeting: true }),
      toolbar(pfx),
      calendar(ui, pfx),
    ],
  });
};
