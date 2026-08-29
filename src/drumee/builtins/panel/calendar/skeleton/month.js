// Month grid — 6 rows × 7 day cells, Sun…Sat, matching Figma 58222:69628.
//
// Ported from the folder-scoped board calendar (window/tasks/skeleton/calendar.js)
// so the two read identically: same day-cell head with a hover "+", same capped
// chip list with a "+N" that jumps to that day, same outside-month dimming.
// What is new here is that a cell holds BOTH tasks and meetings, and that every
// chip carries provenance.
const { chip } = require("./chip");
const { ymd, day, rowStart } = require("./helpers");

// Beyond this a cell would grow the row; the overflow jumps to Day view for
// that date, which is the only place the full list is legible. 43:31159 draws
// four (Jun 11, Jun 13) in its tallest row, which --cal-cell-min accommodates.
const MONTH_MAX = 4;

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
    const shown = list.slice(0, MONTH_MAX);
    const more = list.length - shown.length;
    const kids = shown.map((row) => chip(ui, row, { compact: 1 }));
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
    return Skeletons.Box.Y({ className: `${pfx}__day-body`, kids });
  };

  const dayCell = (d) => {
    const key = ymd(d);
    const inMonth = d.month() === anchorMonth;
    const list = byDay[key] || [];
    // Day 1 shows the month abbreviation ("Jun 1"), per Figma.
    const numText = d.date() === 1 ? d.format("MMM D") : String(d.date());

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
