// A month cell's "+N more" popover: every item of that day the toolbar lets
// through (All / Task / Meeting, Personal | Team — getVisibleItems), grouped
// by kind, meetings first as in the cell. Fed into the page's floating
// day-menu slot and placed over the cell (../index.js _toggleDayMore), so
// opening it repaints nothing under it.
//
// The chips are the month cell's own (compact), so a chip opens its item and
// its × deletes exactly as in the cell.
const { chip } = require("./chip");
const { day, ymd, itemsByDay } = require("./helpers");

module.exports = function (ui, calDay) {
  const pfx = ui.fig.family;
  const d = day(calDay) || Dayjs();
  const list = itemsByDay(ui.getVisibleItems())[ymd(d)] || [];

  const group = (label, rows) =>
    rows.length
      ? Skeletons.Box.Y({
          className: `${pfx}__more-group`,
          kids: [
            Skeletons.Note({
              className: `${pfx}__more-group-label`,
              content: `${label} · ${rows.length}`,
            }),
            ...rows.map((row) => chip(ui, row, { compact: 1 })),
          ],
        })
      : null;

  return Skeletons.Box.Y({
    className: `${pfx}__more`,
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__more-head`,
        kids: [
          // The date opens the day in Day view — what "+N more" itself did
          // before it opened this.
          Skeletons.Note({
            className: `${pfx}__more-title`,
            content: d.format("dddd, MMMM D"),
            bubble: 0,
            service: "cal-day-open",
            uiHandler: [ui],
            calDay: ymd(d),
          }),
          Skeletons.Button.Svg({
            className: `${pfx}__more-close`,
            ico: "cross",
            bubble: 0,
            service: "cal-day-more-close",
            uiHandler: [ui],
            attrOpt: { "aria-label": LOCALE.CLOSE },
          }),
        ],
      }),
      Skeletons.Box.Y({
        className: `${pfx}__more-body`,
        kids: [
          group(LOCALE.MEETING, list.filter((r) => r.kind === "meeting")),
          group(LOCALE.TASK, list.filter((r) => r.kind !== "meeting")),
        ].filter(Boolean),
      }),
    ],
  });
};
