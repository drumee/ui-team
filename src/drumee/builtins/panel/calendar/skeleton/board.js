// The day board behind both Week (7 columns) and Day (1 column).
// Figma 1693:187899 (week-view) and 2066:180690 (day-view - opt 2).
//
// No hour ruler: each day is one cell holding its items in the order every grid
// uses (helpers.itemsByDay) — meetings first by start time, as the frame's
// schedule cards with the time on top, then tasks as cards.
//
//   week  the weekday header, then one row of seven full-height cells — the
//         month cell stretched to the canvas. Each cell scrolls on its own.
//   day   the full weekday name, then one cell: the date in large type, the
//         meetings side by side in a row, and the task cards packed into
//         columns under them. The canvas scrolls, not the cell.
//
// The whole cell adds a task due that day (index.js "cal-day-add"), like the
// month square; so every container in it is inert and only the chips and the
// "+" keep a service of their own — see the note in skeleton/month.js dayCell.
const { chip } = require("./chip");
const { ymd, itemsByDay } = require("./helpers");

/**
 * @param {Object} ui
 * @param {Array<Dayjs>} days  the cells to draw (7 for week, 1 for day)
 * @param {String} mode        "week" | "day"
 */
module.exports = function (ui, days, mode) {
  const pfx = ui.fig.family;
  const isDay = mode === "day";
  const todayKey = ymd(Dayjs());
  const byDay = itemsByDay(ui.getVisibleItems());

  const addButton = (key) =>
    Skeletons.Box.X({
      className: `${pfx}__day-add`,
      bubble: 0,
      service: "cal-day-add",
      uiHandler: [ui],
      calDay: key,
      kidsOpt: { active: 0 },
      kids: [Skeletons.Note({ className: `${pfx}__day-add-ico`, content: "+" })],
    });

  // Week: one stack. Day: the meetings row over the task columns, each group
  // drawn only when it has something in it.
  const body = (list) => {
    if (!isDay) {
      return list.map((row) => chip(ui, row, { board: 1 }));
    }
    const meetings = list.filter((r) => r.kind === "meeting");
    const tasks = list.filter((r) => r.kind !== "meeting");
    return [
      meetings.length
        ? Skeletons.Box.X({
            className: `${pfx}__board-meetings`,
            active: 0,
            kids: meetings.map((row) => chip(ui, row, { board: 1 })),
          })
        : null,
      tasks.length
        ? Skeletons.Box.Y({
            className: `${pfx}__board-tasks`,
            active: 0,
            kids: tasks.map((row) => chip(ui, row, { board: 1, detail: 1 })),
          })
        : null,
    ].filter(Boolean);
  };

  const cell = (d) => {
    const key = ymd(d);
    const list = byDay[key] || [];
    // Week: the hover "+" on the left, the date in the corner (Figma
    // 2066:62176). Day: the date leads in large type and the "+" follows it.
    const num = Skeletons.Note({
      className: `${pfx}__board-num`,
      content: d.format("D"),
      active: 0,
    });
    return Skeletons.Box.Y({
      className: `${pfx}__board-day`,
      bubble: 0,
      service: "cal-day-add",
      uiHandler: [ui],
      calDay: key,
      attrOpt: { "data-today": key === todayKey ? "1" : "0" },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__board-head`,
          active: 0,
          kids: isDay ? [num, addButton(key)] : [addButton(key), num],
        }),
        Skeletons.Box.Y({
          className: `${pfx}__board-body`,
          active: 0,
          kids: body(list),
        }),
      ],
    });
  };

  // Short names centred over their columns in the week; the full name,
  // left-aligned, over the day's one cell. UI language via the global Dayjs
  // locale, as the month header.
  const weekdays = Skeletons.Box.X({
    className: `${pfx}__weekdays`,
    kids: days.map((d) =>
      Skeletons.Note({
        className: `${pfx}__weekday`,
        content: d.format(isDay ? "dddd" : "ddd"),
      }),
    ),
  });

  return Skeletons.Box.Y({
    className: `${pfx}__grid`,
    attrOpt: { "data-view": mode },
    kids: [
      weekdays,
      Skeletons.Box.X({
        className: `${pfx}__board`,
        kids: days.map(cell),
      }),
    ],
  });
};
