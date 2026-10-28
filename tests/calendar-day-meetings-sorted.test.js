// tests/calendar-day-meetings-sorted.test.js — the Day view's meetings row
// (calendar-main__board-meetings) runs earliest first, whatever order the
// server sent. Times from s110@drumee.com's 2026-10-23 on stage, which the
// server lists 12:26, 10:46, 10:47, 10:33, 09:02.
//
//   node --test tests/calendar-day-meetings-sorted.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const DIR = path.join(__dirname, "../src/drumee/builtins/panel/calendar/skeleton");
global.Dayjs = require("dayjs");
global.LOCALE = { SUBTASKS: "Subtasks", PERSONAL: "Personal" };
global._a = { share: "share", folder: "folder" };
global._ = Object.assign(global._ || {}, { uniqueId: (p) => `${p}1` });
global.Skeletons = {
  Box: { X: (o) => ({ t: "X", ...o }), Y: (o) => ({ t: "Y", ...o }) },
  Note: (o) => ({ t: "Note", ...o }),
  Element: (o) => ({ t: "Element", ...o }),
  Image: { Svg: (o) => ({ t: "Svg", ...o }) },
  Button: { Svg: (o) => ({ t: "BtnSvg", ...o }) },
};
const { itemsByDay } = require(path.join(DIR, "helpers.js"));
const origLoad = Module._load;
Module._load = function (req, ...rest) {
  if (req === "media/grid/template/folder") return () => "";
  return origLoad.call(this, req, ...rest);
};
let board, bodyKids;
try {
  board = require(path.join(DIR, "board.js"));
  ({ bodyKids } = board);
} finally {
  Module._load = origLoad;
}

const at = (hhmm) => Dayjs(`2026-10-23T${hhmm}:00`).unix();
const meeting = (id, hhmm) => ({
  kind: "meeting", id, title: "Meeting", stime: at(hhmm), etime: at(hhmm) + 3600, scope: "personal",
});
const serverOrder = [
  meeting("a", "12:26"),
  meeting("b", "10:46"),
  meeting("c", "10:47"),
  meeting("d", "10:33"),
  meeting("e", "09:02"),
];
const ui = { fig: { family: "calendar-main" } };

test("the Day view's meetings row runs earliest first", () => {
  const list = itemsByDay(serverOrder)["2026-10-23"];
  const [row] = bodyKids(ui, list, "day");
  assert.equal(row.className, "calendar-main__board-meetings");
  const times = row.kids.map((chip) => chip.kids.find((k) => /chip-time/.test(k.className)).content);
  assert.deepEqual(times, ["9:02 AM", "10:33 AM", "10:46 AM", "10:47 AM", "12:26 PM"]);
});

// A click on a board column (calendar-main__board-day) opens nothing: adding a
// task or a meeting on a day is the column's "+" menu.
test("a board column has no click service", () => {
  const ui2 = { ...ui, getVisibleItems: () => serverOrder };
  for (const mode of ["day", "week"]) {
    const days = mode === "day" ? [Dayjs("2026-10-23")] : [0, 1, 2].map((i) => Dayjs("2026-10-21").add(i, "day"));
    const grid = board(ui2, days, mode);
    const cols = [];
    const walk = (n) => {
      if (!n || typeof n !== "object") return;
      if (/__board-day\b/.test(n.className || "")) cols.push(n);
      (n.kids || []).forEach(walk);
    };
    walk(grid);
    assert.equal(cols.length, days.length);
    for (const c of cols) {
      assert.equal(c.service, undefined, `${mode} column has no service`);
      assert.equal(c.active, 0, `${mode} column is inert`);
    }
  }
});
