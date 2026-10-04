// files-tab-topics-skeleton.test.js — the Files-tab chat's topic strip and
// File threads bar (Figma 869:189953 / 869:191968).
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

// The strip is a carousel: #General + topics, 3 per page, between a back and
// a next button; the create button (styled like the "+ New" primary button)
// stays at the far end.
const MANY = ["a", "b", "c", "d", "e"].map((x, i) => ({ id: `t${i + 1}`, name: `Topic ${x}`, emoji: "😀" }));
const parts = (kids) => ({
  prev: kids.find((k) => k.service === "topic-strip-prev"),
  next: kids.find((k) => k.service === "topic-strip-next"),
  page: kids.find((k) => /__topic-page\b/.test(k.className || "")),
  create: kids.find((k) => k.service === "topic-new"),
});
const tabsOf = (page) => page.kids.map((k) => (k.topic_id ? k.topic_id : k.service));

test("strip: back · 3 tabs · next · Create topic; page 0 starts with #General", () => {
  const kids = topicStrip(ui, { topics: MANY, canCreateTopic: 1 });
  assert.deepEqual(kids.map((k) => k.service || "page"), ["topic-strip-prev", "page", "topic-strip-next", "topic-new"]);
  const p = parts(kids);
  assert.deepEqual(tabsOf(p.page), ["thread-menu-general", "t1", "t2"]);
  assert.equal(p.page.kids[0].dataset.active, "1");
  assert.match(p.page.kids[0].className, /__topic-tab--general/);
  assert.equal(p.prev.dataset.disabled, "1");
  assert.equal(p.next.dataset.disabled, "0");
  assert.equal(p.prev.ico, "caret-left");
  assert.equal(p.next.ico, "caret-right");
  assert.ok(!kids.some((k) => k.service === "topic-tab-all"));
});

test("strip: pages of 3; the last page may be short; the arrows disable at the ends", () => {
  const p1 = parts(topicStrip(ui, { topics: MANY, page: 1 }));
  assert.deepEqual(tabsOf(p1.page), ["t3", "t4", "t5"]);
  assert.equal(p1.prev.dataset.disabled, "0");
  assert.equal(p1.next.dataset.disabled, "1");
  // Out of range clamps to the last page.
  assert.deepEqual(tabsOf(parts(topicStrip(ui, { topics: MANY, page: 9 })).page), ["t3", "t4", "t5"]);
});

test("strip: a single page draws no arrows; two pages draw both", () => {
  const one = topicStrip(ui, { topics: MANY.slice(0, 1), canCreateTopic: 1 });
  assert.deepEqual(one.map((k) => k.service || "page"), ["page", "topic-new"]);
  // #General + 2 topics fills page 0 exactly: still one page, still no arrows.
  assert.deepEqual(topicStrip(ui, { topics: MANY.slice(0, 2) }).map((k) => k.service || "page"), ["page"]);
  // One more tab spills onto a second page.
  const two = parts(topicStrip(ui, { topics: MANY.slice(0, 3) }));
  assert.ok(two.prev && two.next);
});

test("strip: a full page (3 tabs) is stamped data-full=1, a short one 0", () => {
  assert.equal(parts(topicStrip(ui, { topics: MANY })).page.dataset.full, "1");
  assert.equal(parts(topicStrip(ui, { topics: MANY, page: 1 })).page.dataset.full, "1");
  assert.equal(parts(topicStrip(ui, { topics: MANY.slice(0, 3), page: 1 })).page.dataset.full, "0");
  assert.equal(parts(topicStrip(ui, { topics: [] })).page.dataset.full, "0");
  // The Inbox pages by 4: full means 4 there.
  assert.equal(parts(topicStrip(ui, { topics: MANY.slice(0, 2), pageSize: 4 })).page.dataset.full, "0");
  assert.equal(parts(topicStrip(ui, { topics: MANY.slice(0, 3), pageSize: 4 })).page.dataset.full, "1");
});

test("strip: the scope marks its tab; the create button is the primary style with a plus", () => {
  const p = parts(topicStrip(ui, { topics: MANY, topicId: "t4", page: 1, canCreateTopic: 1 }));
  assert.deepEqual(p.page.kids.map((k) => k.dataset.active), ["0", "1", "0"]);
  assert.match(p.create.className, /window-button__label-button primary/);
  assert.ok(walk(p.create).some((n) => n.ico === "ph-plus"));
  assert.equal(text(p.create), en.TOPIC);
  assert.equal(parts(topicStrip(ui, { topics: MANY })).create, undefined, "no create without chat access");
  // A legacy "all" scope reads as #General.
  assert.equal(parts(topicStrip(ui, { topics: MANY, topicId: "all" })).page.kids[0].dataset.active, "1");
});

test("pageOf: the page that shows a scope", () => {
  assert.equal(topicStrip.pageOf(MANY, "general"), 0);
  assert.equal(topicStrip.pageOf(MANY, "t2"), 0);
  assert.equal(topicStrip.pageOf(MANY, "t3"), 1);
  assert.equal(topicStrip.pageOf(MANY, "gone"), 0);
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

test("page slide stamp: none by default, next / prev when asked", () => {
  assert.equal(parts(topicStrip(ui, { topics: MANY })).page.dataset.slide, "none");
  assert.equal(parts(topicStrip(ui, { topics: MANY, page: 1, slide: "next" })).page.dataset.slide, "next");
  assert.equal(parts(topicStrip(ui, { topics: MANY, slide: "prev" })).page.dataset.slide, "prev");
});

test("group option: an Inbox (chat-p2p) host builds the window__ classes, handler stays the host", () => {
  const host = { fig: { group: "chat-p2p", family: "chat-p2p" } };
  const strip = topicStrip(host, { group: "window", topics: [{ id: "t1", name: "A" }], canCreateTopic: 1 });
  const classes = JSON.stringify(strip);
  assert.match(classes, /window__topic-page/);
  assert.match(classes, /window__topic-tab--create window-button__label-button primary/);
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

test("pageSize: a host may page by another size (the Inbox: 4); pageOf follows it", () => {
  const p0 = parts(topicStrip(ui, { topics: MANY, pageSize: 4 }));
  assert.deepEqual(tabsOf(p0.page), ["thread-menu-general", "t1", "t2", "t3"]);
  const p1 = parts(topicStrip(ui, { topics: MANY, pageSize: 4, page: 1 }));
  assert.deepEqual(tabsOf(p1.page), ["t4", "t5"]);
  assert.equal(p1.next.dataset.disabled, "1");
  assert.equal(topicStrip.pageOf(MANY, "t3", 4), 0);
  assert.equal(topicStrip.pageOf(MANY, "t4", 4), 1);
  // The default stays 3.
  assert.equal(topicStrip.pageOf(MANY, "t3"), 1);
});
