// files-tab-topics-skeleton.test.js — the Files-tab chat's topic strip and
// File threads bar (Figma 775:130783 / 869:189953).
//
//   node --test tests/files-tab-topics-skeleton.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = { Box: { X: node("Box.X"), Y: node("Box.Y") }, Note: node("Note"), Image: { Svg: node("Image.Svg") }, Button: { Svg: node("Button.Svg") } };
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });

const topicStrip = require("../src/drumee/builtins/window/folder/skeleton/topic-strip");
const fileThreadsBar = require("../src/drumee/builtins/window/folder/skeleton/file-threads-bar");
const walk = (n, out = []) => { if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; } if (!n || typeof n !== "object") return out; out.push(n); (n.kids || []).forEach((k) => walk(k, out)); return out; };
const text = (n) => walk(n).filter((k) => k.type === "Note").map((k) => k.content).join(" ");
const ui = { fig: { group: "window", family: "window-folder" } };
const TOPICS = [{ id: "t1", name: "Topic name", emoji: "😀", unread: 90 }];

// The strip: every tab (#General, then the topics) in one scrolling page,
// then "+ Create topic" pinned after it. No arrows, no paging.
const MANY = ["a", "b", "c", "d", "e"].map((x, i) => ({ id: `t${i + 1}`, name: `Topic ${x}`, emoji: "😀" }));
const parts = (kids) => ({
  page: kids.find((k) => /__topic-page\b/.test(k.className || "")),
  create: kids.find((k) => k.service === "topic-new"),
});
const tabsOf = (page) => page.kids.map((k) => (k.topic_id ? k.topic_id : k.service));

test("strip: one page with #General and every topic, then Create topic; no arrows", () => {
  const kids = topicStrip(ui, { topics: MANY, canCreateTopic: 1 });
  assert.deepEqual(kids.map((k) => k.service || "page"), ["page", "topic-new"]);
  const p = parts(kids);
  assert.deepEqual(tabsOf(p.page), ["thread-menu-general", "t1", "t2", "t3", "t4", "t5"]);
  assert.equal(p.page.kids[0].dataset.active, "1");
  assert.match(p.page.kids[0].className, /__topic-tab--general/);
  assert.ok(!walk(kids).some((k) => /topic-strip-(prev|next)|topic-tab-all/.test(k.service || "")));
  assert.deepEqual(topicStrip(ui, { topics: [] }).map((k) => k.service || "page"), ["page"]);
});

test("strip: the scope marks its tab; Create topic is a tab with a plus", () => {
  const p = parts(topicStrip(ui, { topics: MANY, topicId: "t4", canCreateTopic: 1 }));
  assert.deepEqual(p.page.kids.map((k) => k.dataset.active), ["0", "0", "0", "0", "1", "0"]);
  assert.match(p.create.className, /__topic-tab __topic-tab--create|window__topic-tab window__topic-tab--create/);
  assert.doesNotMatch(p.create.className, /primary/);
  assert.ok(walk(p.create).some((n) => n.ico === "ph-plus"));
  assert.equal(text(p.create), en.CREATE_TOPIC);
  assert.equal(parts(topicStrip(ui, { topics: MANY })).create, undefined, "no create without chat access");
  // A legacy "all" scope reads as #General.
  assert.equal(parts(topicStrip(ui, { topics: MANY, topicId: "all" })).page.kids[0].dataset.active, "1");
});

// reveal(): scrolls the page so the picked tab is in view; wheel bound once.
const fakeStrip = (tabLeft, tabWidth, scrollLeft = 0) => {
  const listeners = [];
  const tab = { getBoundingClientRect: () => ({ left: 100 + tabLeft - scrollLeft, width: tabWidth }) };
  const page = { scrollLeft, clientWidth: 200, scrollWidth: 600, dataset: {}, getBoundingClientRect: () => ({ left: 100 }), querySelector: () => tab };
  const el = { querySelector: () => page, addEventListener: (...a) => listeners.push(a) };
  return { part: { el }, page, listeners };
};

test("reveal: scrolls a tab past either edge into view, leaves a visible one alone", () => {
  const raf = global.requestAnimationFrame;
  global.requestAnimationFrame = undefined;
  try {
    const right = fakeStrip(300, 80);
    topicStrip.reveal(right.part);
    assert.equal(right.page.scrollLeft, 180);
    const left = fakeStrip(40, 80, 150);
    topicStrip.reveal(left.part);
    assert.equal(left.page.scrollLeft, 40);
    assert.equal(left.page.dataset.fade, "both", "more tabs on both sides");
    const last = fakeStrip(500, 100);
    topicStrip.reveal(last.part);
    assert.equal(last.page.scrollLeft, 400);
    assert.equal(last.page.dataset.fade, "start", "scrolled to the end");
    assert.equal(fakeStrip(0, 80).page.dataset.fade, undefined);
    const first = fakeStrip(0, 80);
    topicStrip.reveal(first.part);
    assert.equal(first.page.dataset.fade, "end");
    const inView = fakeStrip(50, 80, 0);
    topicStrip.reveal(inView.part);
    assert.equal(inView.page.scrollLeft, 0);
    topicStrip.reveal(inView.part);
    assert.deepEqual(inView.listeners.map((l) => l[0]), ["wheel", "mousedown", "scroll"], "bound once per strip element");
    topicStrip.reveal(null); // no part: no throw
  } finally {
    global.requestAnimationFrame = raf;
  }
});

test("bar: closed = the bar only; open = the thread rows with real unread; active row", () => {
  const items = [{ file_nid: "f1", filename: "Drumee_Strategy_Q2" }, { file_nid: "f3", filename: "2_Drumee_Premium_Visual02", unread: 34 }];
  const closed = fileThreadsBar(ui, { items });
  assert.equal(closed.length, 1);
  assert.equal(closed[0].service, "ft-bar-toggle");
  assert.equal(closed[0].dataset.open, "0");
  assert.ok(walk(closed).some((n) => n.type === "Note" && n.content === en.FILE_THREADS_BAR));
  const open = fileThreadsBar(ui, { items, open: true, scopedNid: "f3" });
  assert.equal(open[0].dataset.open, "1");
  const rows = walk(open).filter((n) => n.service === "thread-menu-file");
  assert.deepEqual(rows.map((r) => r.file_nid), ["f1", "f3"]);
  assert.deepEqual(rows.map((r) => r.filename), ["Drumee_Strategy_Q2", "2_Drumee_Premium_Visual02"]);
  assert.ok(/is-active/.test(rows[1].className));
  assert.deepEqual(walk(rows[1]).filter((n) => /__badge/.test(n.className || "")).map((n) => n.content), ["34"]);
  assert.deepEqual(walk(rows[0]).filter((n) => /__badge/.test(n.className || "")), []);
  const empty = fileThreadsBar(ui, { items: [], open: true });
  assert.ok(walk(empty).some((n) => n.content === en.NO_FILE_THREADS));
});

test("group option: an Inbox (chat-p2p) host builds the window__ classes, handler stays the host", () => {
  const host = { fig: { group: "chat-p2p", family: "chat-p2p" } };
  const strip = topicStrip(host, { group: "window", topics: [{ id: "t1", name: "A" }], canCreateTopic: 1 });
  const classes = JSON.stringify(strip);
  assert.match(classes, /window__topic-page/);
  assert.match(classes, /window__topic-tab window__topic-tab--create/);
  assert.doesNotMatch(classes, /chat-p2p__topic/);
  const create = strip.find((k) => k.service === "topic-new");
  assert.equal(create.uiHandler[0], host);
  const bar = fileThreadsBar(host, { group: "window", open: true, items: [{ file_nid: "f1", filename: "Q2", unread: 2 }] });
  const b = JSON.stringify(bar);
  assert.match(b, /window__ft-bar-card/);
  assert.match(b, /window__ft-row/);
  assert.match(b, /window__thread-menu__badge/);
  assert.doesNotMatch(b, /chat-p2p__ft/);
});
