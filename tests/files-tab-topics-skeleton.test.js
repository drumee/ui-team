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

test("strip: All · #General · topic · + Create topic, All active by default", () => {
  const kids = topicStrip(ui, { topics: TOPICS, canCreateTopic: 1 });
  assert.deepEqual(kids.map((k) => k.service), ["topic-tab-all", "thread-menu-general", "topic-menu-topic", "topic-new"]);
  assert.deepEqual(kids.map((k) => k.dataset && k.dataset.active), ["1", "0", "0", undefined]);
  assert.equal(text(kids[0]), en.ALL);
  assert.equal(text(kids[1]), `#${en.GENERAL}`);
  assert.match(text(kids[2]), /😀/);
  assert.match(text(kids[2]), /Topic name/);
  assert.equal(kids[1].topic_scope, "general");
  assert.equal(kids[2].topic_id, "t1");
  assert.equal(text(kids[3]), `+ ${en.CREATE_TOPIC}`);
});

test("strip: the scope moves the active tab; no + without chat access", () => {
  const t = topicStrip(ui, { topics: TOPICS, topicId: "t1" });
  assert.deepEqual(t.filter((k) => k.dataset).map((k) => k.dataset.active), ["0", "0", "1"]);
  assert.ok(!t.some((k) => k.service === "topic-new"));
  assert.equal(topicStrip(ui, { topics: TOPICS, topicId: "general" })[1].dataset.active, "1");
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
