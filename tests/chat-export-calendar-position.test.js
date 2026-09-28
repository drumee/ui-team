// chat-export-calendar-position.test.js — where the export dialog's flatpickr
// calendar opens. flatpickr's own "below" placement uses page coordinates and
// body.offsetWidth, which the desk's layout breaks (the calendar drifted right
// of the start field and ran off the bottom / right edge from the end field),
// and "below" never flips. placeCalendar works in viewport coordinates for a
// position:fixed calendar.
//
//   node --test tests/chat-export-calendar-position.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const { placeCalendar, positionCalendar } = require("../src/drumee/builtins/widget/chat-export/calendar-position");

const VP = { width: 1200, height: 800 };
const CAL = { width: 280, height: 320 };
const rect = (left, top, width = 230, height = 40) => ({ left, top, width, height, right: left + width, bottom: top + height });

test("opens under the field, left edges aligned, 4px gap", () => {
  assert.deepEqual(placeCalendar(rect(130, 200), CAL, VP), { top: 244, left: 130 });
});

test("no room below but room above → flips above the field", () => {
  assert.deepEqual(placeCalendar(rect(130, 600), CAL, VP), { top: 600 - 4 - 320, left: 130 });
});

test("no room either way → kept inside the viewport bottom", () => {
  const small = { width: 1200, height: 500 };
  assert.deepEqual(placeCalendar(rect(130, 250), CAL, small), { top: 500 - 8 - 320, left: 130 });
});

test("would overflow the right edge → right edges aligned instead", () => {
  assert.deepEqual(placeCalendar(rect(1000, 200, 180), CAL, VP), { top: 244, left: 1180 - 280 });
});

// The dialog card is the horizontal boundary when given: the END field's
// calendar right-aligns under it instead of sticking out past the dialog.
test("would pass the dialog's right edge → right edges aligned, inside the dialog", () => {
  const card = { left: 120, right: 560 };
  assert.deepEqual(placeCalendar(rect(353, 554, 183), CAL, VP, { bounds: card }), { top: 554 - 4 - 320, left: 536 - 280 });
  // the START field still left-aligns
  assert.deepEqual(placeCalendar(rect(144, 554, 183), CAL, VP, { bounds: card }).left, 144);
});

test("never off the left edge", () => {
  assert.deepEqual(placeCalendar(rect(2, 200, 100), { width: 280, height: 320 }, { width: 250, height: 800 }).left, 8);
});

test("positionCalendar pins the calendar with fixed viewport coordinates to the field's wrap", () => {
  const style = {};
  const wrap = { getBoundingClientRect: () => rect(130, 200) };
  const card = { getBoundingClientRect: () => ({ left: 100, right: 500, top: 0, bottom: 700 }) };
  const input = {
    closest: (sel) => ({ ".widget-chat-export__date-input-wrap": wrap, ".widget-chat-export__card": card })[sel] || null,
    getBoundingClientRect: () => rect(160, 206, 180, 28),
  };
  const fp = {
    _positionElement: input,
    calendarContainer: { style, offsetWidth: 280, children: [{ offsetHeight: 300 }, { offsetHeight: 20 }] },
  };
  global.window = { innerWidth: 1200, innerHeight: 800 };
  positionCalendar(fp);
  assert.deepEqual(
    { position: style.position, top: style.top, left: style.left, right: style.right },
    { position: "fixed", top: "244px", left: "130px", right: "auto" },
  );
  delete global.window;
});
