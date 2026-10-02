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
const { positionCalendar } = require("../src/drumee/builtins/widget/chat-export/calendar-position");
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
    // Our viewport-coordinate placement, not flatpickr's page-coordinate one.
    assert.equal(x.vendorOpt.position, positionCalendar);
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

// Chat scope checkboxes draw the app's checkmark glyph (editbox_checkmark, as
// the invite popup and the settings dialogs do), not chat-tick.
test("a checked scope checkbox shows editbox_checkmark", () => {
  const t = build({ _allChecked: true });
  const ticks = walk(t).filter((n) => n.className === "widget-chat-export__checkbox-ico");
  assert.ok(ticks.length >= 1);
  for (const n of ticks) assert.equal(n.ico, "editbox_checkmark");
});

// The row is a named part, rendered loading (data-ready 0) until
// date-row-ready.js stamps it once both pickers have mounted.
test("date row is a named part that starts loading", () => {
  const t = build();
  const rowNode = walk(t).find((n) => n.className === "widget-chat-export__date-row");
  assert.equal(rowNode.sys_pn, "date-row");
  assert.equal(rowNode.partHandler.fig.family, "widget-chat-export");
  // No model dataset: onRender would write it AFTER the watcher's stamp and
  // put the row back to loading. A missing stamp already reads as loading.
  assert.equal(rowNode.dataset, undefined);
});

// Format cards: one row — the icon (format-card-top) left, then a text column
// with the title and the subtitle, each on its own single line.
test("format card lays out icon | title over subtitle in a row", () => {
  const t = build({ _format: "json" });
  const cards = walk(t).filter((n) => /widget-chat-export__format-card(\s|$)/.test(n.className || ""));
  assert.equal(cards.length, 2);
  for (const c of cards) {
    assert.equal(c.type, "Box.X");
    assert.equal(c.service, "set-format");
    const [top, text] = c.kids;
    assert.equal(top.className, "widget-chat-export__format-card-top");
    assert.equal(text.className, "widget-chat-export__format-text");
    assert.equal(text.type, "Box.Y");
    assert.match(text.kids[0].className, /widget-chat-export__format-title/);
    assert.match(text.kids[1].className, /widget-chat-export__format-subtitle/);
  }
  assert.match(cards[1].className, /is-active/);
});

// Folder card icon = the desk's workspace art (media/grid/template/folder,
// what the sidebar draws): folder shape tinted by the workspace type plus its
// badge — internal (private), external (share), personal.
const iconHtml = (area) => {
  const t = (sk.default || sk)({
    fig: { family: "widget-chat-export", group: "widget" },
    mget: (k) => ({ name: "Workspace", area })[k],
    _format: "pdf", _folders: [], _fileThreads: [],
    _checkedFolderNids: new Set(), _checkedThreadIds: new Set(), _allChecked: true,
  });
  const box = walk(t).find((n) => n.className === "widget-chat-export__folder-icon-box");
  const art = walk(box).find((n) => n.type === "Element");
  assert.ok(art, `no workspace art for ${area}`);
  assert.equal(walk(box).filter((n) => n.type === "Image.Svg").length, 0);
  return art.content;
};

test("folder icon box shows the workspace art for internal / external / personal", () => {
  for (const area of ["private", "share", "personal"]) {
    const html = iconHtml(area);
    assert.match(html, new RegExp(`class="folder-shape ${area}"`), area);
    assert.match(html, new RegExp(`class="badge ${area}`), area);
    assert.doesNotMatch(html, /folder-trigger/); // no kebab in a dialog
  }
});
