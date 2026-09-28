// chat-export-date.test.js — the export dialog's date range uses the app's
// flatpickr date picker (widget/datepicker, kind "date_picker") instead of a
// native <input type=date>.
//
//   node --test tests/chat-export-date.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const dayjs = require("dayjs");

const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"),
  Element: node("Element"),
  Image: { Svg: node("Image.Svg") },
  Button: { Svg: node("Button.Svg") },
  List: { Scroll: node("List.Scroll") },
};
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
String.prototype.format = function (...a) {
  return String(this).replace(/\{(\d+)\}/g, (_, i) => a[i]);
};
global._a = new Proxy({}, { get: (t, k) => k });
global._e = new Proxy({}, { get: (t, k) => k });
global._ = require("underscore");
global.Dayjs = dayjs;
const BODY = { tag: "body" };
global.document = { body: BODY };

const sk = require("../src/drumee/builtins/widget/chat-export/skeleton/index.js");
const build = (extra = {}) =>
  (sk.default || sk)({
    fig: { family: "widget-chat-export", group: "widget" },
    mget: (k) => ({ name: "Workspace", area: "private" })[k],
    _format: "pdf",
    _folders: [],
    _fileThreads: [],
    _checkedFolderNids: new Set(),
    _checkedThreadIds: new Set(),
    _allChecked: true,
    _dateEnabled: true,
    ...extra,
  });
const walk = (n, out = []) => {
  if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; }
  if (!n || typeof n !== "object") return out;
  out.push(n);
  (n.kids || []).forEach((k) => walk(k, out));
  return out;
};
const pickers = (tree) => walk(tree).filter((n) => n.kind === "date_picker");

test("date range: two flatpickr pickers inside the input wraps, no native date input", () => {
  const t = build();
  const p = pickers(t);
  assert.equal(p.length, 2);
  assert.deepEqual(p.map((x) => x.service), ["date-start-change", "date-end-change"]);
  for (const x of p) {
    assert.equal(x.innerClass, "widget-chat-export__date-input");
    // Y-m-d is what _setStartDate / _setEndDate parse; d/m/Y is what the user reads.
    assert.equal(x.vendorOpt.dateFormat, "Y-m-d");
    assert.equal(x.vendorOpt.altInput, true);
    assert.equal(x.vendorOpt.altFormat, "d/m/Y");
    // Out of the scrolling card, so it is never clipped.
    assert.equal(x.vendorOpt.appendTo, BODY);
    assert.equal(x.uiHandler[0].fig.family, "widget-chat-export");
  }
  const wraps = walk(t).filter((n) => n.className === "widget-chat-export__date-input-wrap");
  assert.equal(wraps.length, 2);
  wraps.forEach((w, i) => assert.equal(walk(w).find((n) => n.kind === "date_picker"), p[i]));
  assert.equal(walk(t).filter((n) => n.type === "Element" && n.tagName === "input").length, 0);
});

test("date range: an unset date starts empty, a set one is re-seeded on re-render", () => {
  const empty = pickers(build());
  assert.deepEqual(empty.map((x) => x.value), ["", ""]);
  const start = dayjs("2026-09-01").unix();
  const end = dayjs("2026-09-28").unix();
  const set = pickers(build({ _startDate: start, _endDate: end }));
  assert.deepEqual(set.map((x) => x.value), ["2026-09-01", "2026-09-28"]);
});

test("date range off: no pickers", () => {
  assert.equal(pickers(build({ _dateEnabled: false })).length, 0);
});
