// topic-fit.test.js — the topic carousel fills its page with as many tabs as
// fit (window/folder/topic-fit.js), against fake elements with fixed widths.
//
//   node --test tests/topic-fit.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const Fit = require("../src/drumee/builtins/window/folder/topic-fit");

// A strip: back arrow · page (tabs of the given widths, 4px gap) · next arrow.
function strip(widths, avail) {
  const tabs = widths.map((w) => ({ dataset: { fit: "1" }, get offsetWidth() { return this.dataset.fit === "0" && !page.dataset.measuring ? 0 : w; } }));
  const page = { className: "window__topic-page", dataset: {}, children: tabs, clientWidth: avail };
  const prev = { dataset: { disabled: "0" } };
  const next = { dataset: { disabled: "0" } };
  const el = {
    querySelector: (sel) => (/__topic-page/.test(sel) ? page : null),
    querySelectorAll: (sel) => (/__topic-arrow/.test(sel) ? [prev, next] : []),
  };
  const shown = () => tabs.map((t, i) => (t.dataset.fit === "1" ? i : -1)).filter((i) => i >= 0);
  return { el, page, tabs, prev, next, shown };
}

test("fit: from the start, every tab that fits is shown — not just 3", () => {
  // 100 + 4 + 60 + 4 + 60 + 4 + 60 = 292 ≤ 300; the 5th (80) does not fit.
  const s = strip([100, 60, 60, 60, 80, 70], 300);
  assert.deepEqual(Fit.fit(s.el, 0), { start: 0, count: 4 });
  assert.deepEqual(s.shown(), [0, 1, 2, 3]);
  assert.equal(s.prev.dataset.disabled, "1");
  assert.equal(s.next.dataset.disabled, "0");
  assert.equal(s.page.dataset.measuring, undefined, "measuring flag cleared");
});

test("fit: the last page takes tabs back from the one before so it stays full", () => {
  const s = strip([100, 60, 60, 60, 80, 70], 300);
  // From 4: 80 + 4 + 70 = 154; back-fill 60 (+4) → 218, 60 (+4) → 282, 60 (+4) → 346 no.
  assert.deepEqual(Fit.fit(s.el, 4), { start: 2, count: 4 });
  assert.deepEqual(s.shown(), [2, 3, 4, 5]);
  assert.equal(s.prev.dataset.disabled, "0");
  assert.equal(s.next.dataset.disabled, "1");
});

test("fit: a kept tab (the picked topic) is always on the page", () => {
  const s = strip([100, 60, 60, 60, 80, 70, 90, 90], 300);
  // From 0 only 0–3 fit; keeping 6 moves the page so 6 is its last tab.
  const r = Fit.fit(s.el, 0, 6);
  assert.ok(s.shown().includes(6));
  assert.equal(r.start + r.count - 1, 6);
});

test("fit: one tab wider than the page is still shown alone", () => {
  const s = strip([500, 60], 300);
  assert.deepEqual(Fit.fit(s.el, 0), { start: 0, count: 1 });
  assert.deepEqual(s.shown(), [0]);
});

test("prevStart: the page before is as full as the width allows", () => {
  const s = strip([100, 60, 60, 60, 80, 70], 300);
  Fit.fit(s.el, 4);
  // Ending before 2: 60 (idx 1) + 4 + 100 (idx 0) = 164 → starts at 0.
  assert.equal(Fit.prevStart(s.el, 2), 0);
  const t = strip([100, 60, 60, 60, 80, 70], 150);
  // Ending before 4: 60 + 4 + 60 = 124 fits, + 4 + 60 = 188 does not → 2.
  assert.equal(Fit.prevStart(t.el, 4), 2);
});

test("no DOM (tests, detached part): fit and prevStart answer null", () => {
  assert.equal(Fit.fit(null, 0), null);
  assert.equal(Fit.fit({ dataset: {} }, 0), null);
  assert.equal(Fit.prevStart({ dataset: {} }, 3), null);
});

test("attach: fits after the feed, reports the result, re-fits on resize", () => {
  const s = strip([100, 60, 60, 60, 80, 70], 300);
  let observed;
  global.ResizeObserver = class { constructor(cb) { observed = cb; } observe() {} };
  global.requestAnimationFrame = (f) => f();
  const got = [];
  Fit.attach({ el: s.el }, () => ({ start: 0 }), (r) => got.push(r));
  assert.deepEqual(got, [{ start: 0, count: 4 }]);
  s.page.clientWidth = 170;
  observed();
  assert.deepEqual(got.at(-1), { start: 0, count: 2 });
  delete global.ResizeObserver;
  delete global.requestAnimationFrame;
});
