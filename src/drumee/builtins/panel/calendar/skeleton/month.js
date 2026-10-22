// Month grid — 6 rows × 7 day cells, Sun…Sat, matching Figma 1693:181977.
// Cell and header: Figma 1693:181977 (header 1697:48528, cells 1697:48538 /
// 1697:48540 / 1697:48545, hover 1693:180985) — the cell the Meet and Task
// tabs draw too.
//
// Ported from the folder-scoped board calendar (window/tasks/skeleton/calendar.js):
// same day-cell head with a hover "+", the same chip list with a "+N" that jumps
// to that day. What is new here is that a cell holds BOTH tasks and meetings,
// drawn as the frame's cards and chips (skeleton/chip.js), so its items are not
// all one height and the "+N" below is counted from each item's own.
const { chip, hasPill } = require("./chip");
const { ymd, day, itemsByDay } = require("./helpers");

// A busy day renders EVERY item and the cell scrolls — skin/index.scss makes
// __day-body the scroll container — and a "+N" footer, pinned to the bottom of
// it, counts the items that do not stand whole above that footer.
//
// The count is made here, from the heights the skin gives each kind of item,
// because CSS cannot ask whether a box overflows. Every item is one line of
// text per field, so its height depends only on what it is, never on its
// title. All in px; measured on stage:
//
//   body      115   the cell body at the row FLOOR (--cal-cell-min 170px, less
//                   12px padding top and bottom, the 20px date line, its 10px
//                   gap and the 1px rule)
//   gap        10   between items (--cal-gap)
//   footer     26   the "+N" line, 16px, plus the gap it covers above itself
//   meeting  24.8   the one-line chip: 4px padding around a 16.8px line
//   task     52.4   the card: 12px padding, the 8px dot, 4px, the 14.4px name,
//                   inside a 1px border
//   workspace 86.8  the card plus 12px and the 22.4px workspace pill
//
// Change any of these rules in the skin and this table goes stale silently.
//
// Exact at the floor, which is the height rows keep in any window up to about
// 1240px tall (the grid gets 709px of a 900px window and needs 1050px for its
// header and six rows). Above that it shares its extra height among the rows, so
// a cell shows more than the floor would and "+N" can run ahead of what is
// actually out of sight; nothing is ever hidden, so it still reads as "this
// day runs past the fold".
// The "+N" footer is hidden for now: the cell grows to 2× its floor and
// scrolls instead (skin &__day). Flip to bring it back; `more` is still
// counted either way for data-overflow.
const SHOW_DAY_MORE = false;

const FIT = {
  body: 115,
  gap: 10,
  footer: 26,
  meeting: 24.8,
  task: 52.4,
  workspace: 86.8,
};

// A task card is a workspace card exactly when chip.js draws it the pill.
const itemHeight = (row) => {
  if (row.kind === "meeting") return FIT.meeting;
  return hasPill(row) ? FIT.workspace : FIT.task;
};

/**
 * How many of a day's items (in display order) stand whole in a cell at its
 * floor height. All of them when they fit the body; otherwise those that end
 * above the "+N" footer.
 */
function fitCount(list) {
  const heights = list.map(itemHeight);
  const total =
    heights.reduce((sum, h) => sum + h, 0) + FIT.gap * (heights.length - 1);
  if (total <= FIT.body) return heights.length;
  const room = FIT.body - FIT.footer;
  let top = 0;
  let n = 0;
  for (const h of heights) {
    if (top + h > room) break;
    top += h + FIT.gap;
    n++;
  }
  return n;
}

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const anchor = day(ui.getCursor()) || Dayjs();
  const today = Dayjs();
  const todayKey = ymd(today);
  const anchorMonth = anchor.month();

  const byDay = itemsByDay(ui.getVisibleItems());

  const dayBody = (list, key) => {
    if (!list.length) return null;
    const kids = list.map((row) => chip(ui, row, { compact: 1 }));
    const more = list.length - fitCount(list);
    if (SHOW_DAY_MORE && more > 0) {
      kids.push(
        Skeletons.Note({
          className: `${pfx}__day-more`,
          content: `+${more}`,
          bubble: 0,
          service: "cal-day-more",
          uiHandler: [ui],
          calDay: key,
        }),
      );
    }
    return Skeletons.Box.Y({
      className: `${pfx}__day-body`,
      // Inert: the empty space around the chips belongs to the cell's click
      // (see dayCell). The chips inside keep their own.
      active: 0,
      // The cell scrolls, but at rest its scrollbar is transparent (see
      // quiet-scroll) — so a busy day looked exactly like a truncated one and
      // read as "I cannot get to the rest of these". CSS cannot ask whether a
      // box overflows; the skeleton already knows, because it is the same
      // comparison the "+N" is built from. Stamped here, inked in the skin.
      attrOpt: { "data-overflow": more > 0 ? "1" : "0" },
      kids,
    });
  };

  const dayCell = (d) => {
    const key = ymd(d);
    const inMonth = d.month() === anchorMonth;
    const list = byDay[key] || [];
    // Top-right, no leading zero ("7"), and the first of a month names its
    // month ("Jun 1") — the same rule in all three month grids. Outside-month
    // dates still dim, so the boundary reads both ways.
    const numText = d.date() === 1 ? d.format("MMM D") : d.format("D");

    // The whole cell is the day's "add a task" target, not just its "+": a
    // click anywhere in the square opens the create-task popup due that day,
    // the same popup the week/day squares open (index.js "cal-day-add").
    //
    // For that to work every CONTAINER inside the cell is inert (`active: 0`).
    // ui-core binds a click to every widget left at the default and calls
    // e.stopPropagation() before triggerHandlers, so an active head, date or
    // chip stack would swallow the click on its own area and the cell would
    // never hear it. The things that DO something keep their own service and
    // stay active, and that same stopPropagation keeps them from also firing
    // the cell: a chip opens its item, "+N" opens the Day view, a chip's ×
    // deletes, and the "+" adds exactly as the cell does.
    return Skeletons.Box.Y({
      className: `${pfx}__day`,
      bubble: 0,
      service: "cal-day-add",
      uiHandler: [ui],
      calDay: key,
      attrOpt: {
        "data-today": key === todayKey ? "1" : "0",
        "data-outside": inMonth ? "0" : "1",
      },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__day-head`,
          active: 0,
          kids: [
            // Right-packed: the hover-revealed quick-add, then the date in
            // the corner. A text glyph rather than the `plus` sprite: the
            // sprite symbol cannot be recoloured across the <use> boundary
            // and renders invisible (same reason as the board calendar).
            Skeletons.Box.X({
              className: `${pfx}__day-add`,
              bubble: 0,
              service: "cal-day-add",
              uiHandler: [ui],
              calDay: key,
              // Without this the "+" glyph swallows the click and the day
              // quick-add does nothing at all.
              kidsOpt: { active: 0 },
              kids: [
                Skeletons.Note({
                  className: `${pfx}__day-add-ico`,
                  content: "+",
                }),
              ],
            }),
            Skeletons.Note({
              className: `${pfx}__day-num`,
              content: numText,
              active: 0,
            }),
          ],
        }),
        dayBody(list, key),
      ].filter(Boolean),
    });
  };

  const weekStart = anchor.startOf("week");
  const weekdays = Skeletons.Box.X({
    className: `${pfx}__weekdays`,
    kids: Array.from({ length: 7 }, (_, i) =>
      // Short day names ("Sun"), centred over their column, in the UI
      // language (the global Dayjs locale, set where the string table is).
      Skeletons.Note({
        className: `${pfx}__weekday`,
        content: weekStart.add(i, "day").format("ddd"),
      }),
    ),
  });

  let cur = anchor.startOf("month").startOf("week");
  const weeks = [];
  for (let w = 0; w < 6; w++) {
    weeks.push(
      Skeletons.Box.X({
        className: `${pfx}__week-row`,
        kids: Array.from({ length: 7 }, (_, i) => dayCell(cur.add(i, "day"))),
      }),
    );
    cur = cur.add(7, "day");
  }

  return Skeletons.Box.Y({
    className: `${pfx}__grid`,
    attrOpt: { "data-view": "month" },
    kids: [weekdays, Skeletons.Box.Y({ className: `${pfx}__month`, kids: weeks })],
  });
};
