// Month grid — 6 rows × 7 day cells, Sun…Sat, matching Figma 58222:69628.
//
// Ported from the folder-scoped board calendar (window/tasks/skeleton/calendar.js):
// same day-cell head with a hover "+", the same chip list with a "+N" that jumps
// to that day. What is new here is that a cell holds BOTH tasks and meetings,
// and that every chip carries provenance.
//
// The two no longer behave identically, though. That one still slices its cell
// to MONTH_MAX and drops the remainder, so a busy day there is still unreadable
// — it has its own skin (window/tasks/skin/index.scss, __cal-day-*), so fixing
// it is a separate change along the lines of this one.
const { chip } = require("./chip");
const { ymd, day, rowStart } = require("./helpers");

// A busy day renders EVERY item and the cell scrolls — skin/index.scss makes
// __day-body the scroll container.
//
// It used to slice to four and drop the rest, and the rest was unreachable two
// ways at once. --cal-cell-min replaces the row's content-based `min-height`,
// so a row never grows to fit its fullest cell; and four chips did not fit what
// that leaves, because the compact chip was inheriting the hour block's 12px
// padding and standing 42px tall. Measured in the old geometry: an 87px cell
// body showed ONE of four task chips, and clipped the "+N" that was supposed to
// rescue it — the last child of a hidden-overflow stack is the first thing lost.
//
// MONTH_FIT is how many compact chips stand in a cell at rest, and it only
// labels the "+N". Measured against the row FLOOR (--cal-cell-min: 118px in the
// skin): 16px of padding, a 20px date line and a 2px gap leave 80px — three
// 19px chips on 2px gaps (61px) plus the pinned footer. Rows grow with the
// grid above that floor, as the Meet tab's do, so in a tall window the label
// can run ahead of what is actually below the fold. Nothing is
// hidden now, so the number reads as "this day runs past the fold" — and the
// footer is sticky, so the one affordance that leads to the whole day cannot
// itself scroll out of reach.
const MONTH_FIT = 3;

module.exports = function (ui) {
  const pfx = ui.fig.family;
  const anchor = day(ui.getCursor()) || Dayjs();
  const today = Dayjs();
  const todayKey = ymd(today);
  const anchorMonth = anchor.month();

  // Group the visible rows by day. Meetings sort before tasks within a day, and
  // meetings sort by start time — a timed item above an all-day one reads as the
  // agenda it is.
  const byDay = {};
  ui.getVisibleItems().forEach((row) => {
    const s = rowStart(row);
    if (!s) return;
    const k = ymd(s);
    (byDay[k] = byDay[k] || []).push(row);
  });
  Object.keys(byDay).forEach((k) => {
    byDay[k].sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "meeting" ? -1 : 1;
      if (a.kind === "meeting") return (a.stime || 0) - (b.stime || 0);
      return String(a.title).localeCompare(String(b.title));
    });
  });

  const dayBody = (list, key) => {
    if (!list.length) return null;
    const kids = list.map((row) => chip(ui, row, { compact: 1 }));
    const more = list.length - MONTH_FIT;
    if (more > 0) {
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
    // Two digits, top-left, as the Meet tab's month cell draws it ("07").
    // It used to read "7" on the right and "Sep 1" on the first of a month;
    // the month boundary is carried by the dimmed outside-month dates instead,
    // which is the Meet tab's cue.
    const numText = d.format("DD");

    return Skeletons.Box.Y({
      className: `${pfx}__day`,
      attrOpt: {
        "data-today": key === todayKey ? "1" : "0",
        "data-outside": inMonth ? "0" : "1",
      },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__day-head`,
          kids: [
            // The date on the left (the Meet tab's place for it), the
            // hover-revealed quick-add on the right.
            Skeletons.Note({
              className: `${pfx}__day-num`,
              content: numText,
            }),
            // Quick-add on the cell. A text glyph rather than the `plus`
            // sprite: the sprite symbol cannot be recoloured across the <use>
            // boundary and renders invisible (same reason as the board
            // calendar).
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
      // Full day names, left-aligned in a bordered header row — the Meet tab's
      // month header ("Monday"), not the centred "Mon" this grid used.
      Skeletons.Note({
        className: `${pfx}__weekday`,
        content: weekStart.add(i, "day").format("dddd"),
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
