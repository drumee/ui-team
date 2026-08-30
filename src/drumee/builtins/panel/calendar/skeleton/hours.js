// The hour-ruled canvas behind both Week (7 columns) and Day (1 column).
// Figma 58222:171611 (week) and 58222:172317 (day).
//
// There is no precedent for this layout in the codebase — the board calendar is
// day-cells only — so the geometry lives here once and both views configure it.
//
// ── One deliberate deviation from the frames ──────────────────────────────────
// The frames place task cards at hour positions. Real tasks cannot be placed
// there: `task.due_date` is a calendar DATE with no time (server task.js), so any
// hour would be invented. Tasks therefore render in an all-day strip at the top
// of their column — the standard treatment, and the only honest one. Raised as
// M-03/M-04 for Lexis; a timed task would need a start_time field that does not
// exist today.
const { chip } = require("./chip");
const {
  ymd,
  day,
  fromEpoch,
  rowStart,
  DAY_START_HOUR,
  DAY_END_HOUR,
} = require("./helpers");

/** Minutes from midnight for a meeting's start / end. */
const startMin = (row) => {
  const d = fromEpoch(row.stime);
  return d ? d.hour() * 60 + d.minute() : 0;
};
const endMin = (row) => {
  const d = fromEpoch(row.etime);
  const s = startMin(row);
  if (!d) return s + 30;
  const e = d.hour() * 60 + d.minute();
  // A meeting that ends on/before its start (bad data, or one crossing
  // midnight) still needs a visible block.
  return e > s ? e : s + 30;
};

/**
 * Lay overlapping meetings out side by side.
 *
 * Clusters of transitively-overlapping items share the column width, so two
 * concurrent meetings each take half and a lone one takes the full column —
 * which is what the day frame shows with its items sitting next to each other.
 */
function assignColumns(rows) {
  const sorted = rows.slice().sort((a, b) => startMin(a) - startMin(b) || endMin(a) - endMin(b));
  const out = [];
  let cluster = [];
  let clusterEnd = -1;

  const flush = () => {
    if (!cluster.length) return;
    // Greedy column packing within the cluster.
    const colEnds = [];
    cluster.forEach((item) => {
      let col = colEnds.findIndex((e) => e <= startMin(item));
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(0);
      }
      colEnds[col] = endMin(item);
      item.__col = col;
    });
    const width = colEnds.length;
    cluster.forEach((item) => {
      out.push({ row: item, col: item.__col, cols: width });
      delete item.__col;
    });
    cluster = [];
    clusterEnd = -1;
  };

  sorted.forEach((item) => {
    if (cluster.length && startMin(item) >= clusterEnd) flush();
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, endMin(item));
  });
  flush();
  return out;
}

/**
 * @param {Object} ui
 * @param {Array<Dayjs>} days  the columns to draw (7 for week, 1 for day)
 * @param {String} view        'week' | 'day' — stamped for the skin
 */
module.exports = function (ui, days, view) {
  const pfx = ui.fig.family;
  const todayKey = ymd(Dayjs());

  // Split the visible rows per column, timed from all-day.
  const timed = {};
  const allDay = {};
  days.forEach((d) => {
    const k = ymd(d);
    timed[k] = [];
    allDay[k] = [];
  });

  ui.getVisibleItems().forEach((row) => {
    const s = rowStart(row);
    if (!s) return;
    const k = ymd(s);
    if (!(k in timed)) return;
    if (row.kind === "meeting" && row.stime) timed[k].push(row);
    else allDay[k].push(row);
  });

  // Grow the ruler to cover anything outside the default window rather than
  // clipping it — an 06:30 stand-up must not vanish because the ruler starts
  // at 07:00.
  let first = DAY_START_HOUR;
  let last = DAY_END_HOUR;
  Object.keys(timed).forEach((k) =>
    timed[k].forEach((row) => {
      first = Math.min(first, Math.floor(startMin(row) / 60));
      last = Math.max(last, Math.ceil(endMin(row) / 60));
    }),
  );
  first = Math.max(0, first);
  last = Math.min(24, Math.max(last, first + 1));

  const total = (last - first) * 60;
  const pct = (minutes) => `${((minutes / total) * 100).toFixed(4)}%`;

  const hourLabels = Skeletons.Box.Y({
    className: `${pfx}__hours-gutter`,
    kids: Array.from({ length: last - first }, (_, i) => {
      const h = first + i;
      // 12-hour clock with a correct meridiem — the frames label noon "12 AM".
      const d = Dayjs().startOf("day").add(h, "hour");
      return Skeletons.Box.Y({
        className: `${pfx}__hour-label`,
        kids: [Skeletons.Note({ content: d.format("h A") })],
      });
    }),
  });

  const column = (d) => {
    const k = ymd(d);
    const placed = assignColumns(timed[k] || []);

    const blocks = placed.map(({ row, col, cols }) => {
      const s = startMin(row);
      const e = endMin(row);
      // Absolute placement inside the column canvas. The skin sets
      // `position:absolute` on the class; the geometry has to be inline
      // because it is data. Passed into the builder, not assigned afterwards.
      return chip(ui, row, {
        style: {
          top: pct(s - first * 60),
          // Floor at 20 minutes so a zero-length meeting is still clickable.
          height: pct(Math.max(e - s, 20)),
          left: `${((col / cols) * 100).toFixed(4)}%`,
          width: `${(100 / cols).toFixed(4)}%`,
        },
      });
    });

    const rules = Array.from({ length: last - first }, () =>
      Skeletons.Box.Y({ className: `${pfx}__hour-rule` }),
    );

    return Skeletons.Box.Y({
      className: `${pfx}__hours-col`,
      attrOpt: { "data-today": k === todayKey ? "1" : "0" },
      kids: [
        Skeletons.Box.Y({ className: `${pfx}__hour-rules`, kids: rules }),
        Skeletons.Box.Y({ className: `${pfx}__hour-blocks`, kids: blocks }),
      ],
    });
  };

  const headCell = (d) => {
    const k = ymd(d);
    const items = allDay[k] || [];
    return Skeletons.Box.Y({
      className: `${pfx}__hours-head-cell`,
      attrOpt: { "data-today": k === todayKey ? "1" : "0" },
      kids: [
        Skeletons.Box.X({
          className: `${pfx}__hours-head-date`,
          bubble: 0,
          service: "cal-day-add",
          uiHandler: [ui],
          calDay: k,
          // active:0 or a child eats the click before triggerHandlers runs.
          kidsOpt: { active: 0 },
          kids: [
            Skeletons.Note({
              className: `${pfx}__hours-head-num`,
              content: d.format("DD"),
            }),
            Skeletons.Note({
              className: `${pfx}__hours-head-name`,
              content: d.format(view === "day" ? "dddd" : "ddd"),
            }),
          ],
        }),
        // All-day strip: tasks, and any meeting whose start time was cleared.
        items.length
          ? Skeletons.Box.Y({
              className: `${pfx}__allday`,
              kids: items.map((row) => chip(ui, row, { compact: 1 })),
            })
          : null,
      ].filter(Boolean),
    });
  };

  return Skeletons.Box.Y({
    className: `${pfx}__grid`,
    attrOpt: { "data-view": view },
    kids: [
      Skeletons.Box.X({
        className: `${pfx}__hours-head`,
        kids: [
          Skeletons.Box.Y({ className: `${pfx}__hours-head-spacer` }),
          ...days.map(headCell),
        ],
      }),
      Skeletons.Box.X({
        className: `${pfx}__hours-body`,
        kids: [hourLabels, ...days.map(column)],
      }),
    ],
  });
};
