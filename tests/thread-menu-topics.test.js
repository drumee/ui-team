// thread-menu-topics.test.js — the thread menu / rail "Topics" section
// (Figma 867:185782, 869:187685): label + "+", All, # General, one row per
// topic (emoji + name + unread); File Threads and Download unchanged.
//
//   node --test tests/thread-menu-topics.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = { Box: { X: node("Box.X"), Y: node("Box.Y") }, Note: node("Note"), Image: { Svg: node("Image.Svg") }, Button: { Svg: node("Button.Svg") } };
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });

const threadMenu = require("../src/drumee/builtins/window/folder/skeleton/thread-menu");
const walk = (n, out = []) => { if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; } if (!n || typeof n !== "object") return out; out.push(n); (n.kids || []).forEach((k) => walk(k, out)); return out; };
const ui = { fig: { group: "window", family: "window-folder" } };
const hasCls = (n, c) => (n.className || "").split(/\s+/).includes(c);
const rowsOf = (t) => walk(t).filter((n) => hasCls(n, "window__thread-menu__row"));
const text = (n) => walk(n).filter((k) => k.type === "Note").map((k) => k.content).join(" ");
const TOPICS = [{ id: "t1", name: "Design", emoji: "😀", unread: 3 }, { id: "t2", name: "Budget", emoji: "💰", unread: 0 }];

test("Topics section: label + '+', # General then topics — no All row", () => {
  const t = threadMenu(ui, { topics: TOPICS, topicId: "general", canCreateTopic: 1 });
  const first = t.kids[0];
  assert.ok(walk(first).some((n) => n.type === "Note" && n.content === en.TOPICS), "labelled Topics");
  assert.ok(!walk(t).some((n) => n.content === en.THIS_FOLDER), "no This Folder label");
  assert.ok(walk(first).find((n) => n.service === "topic-new"), "+ present");
  const rows = rowsOf(first);
  assert.deepEqual(rows.map((r) => r.service), ["thread-menu-general", "topic-menu-topic", "topic-menu-topic"]);
  assert.ok(!walk(t).some((n) => n.service === "topic-menu-all"));
  assert.ok(!walk(first).some((n) => n.type === "Note" && n.content === en.ALL));
  assert.equal(text(rows[0]), `# ${en.GENERAL}`);
  assert.equal(rows[0].topic_scope, "general");
  assert.match(text(rows[1]), /😀/);
  assert.equal(rows[1].topic_id, "t1");
  assert.ok(walk(rows[1]).some((n) => hasCls(n, "window__thread-menu__row-emoji") && n.content === "😀"));
});

test("General active by default; a topic moves it; legacy all reads as General; badges only on topics", () => {
  const def = rowsOf(threadMenu(ui, { topics: TOPICS }).kids[0]);
  assert.deepEqual(def.map((r) => /is-active/.test(r.className)), [true, false, false]);
  const badge = (r) => walk(r).filter((n) => hasCls(n, "window__thread-menu__badge")).map((n) => n.content);
  assert.deepEqual(def.map(badge), [[], ["3"], []]);
  const t1 = rowsOf(threadMenu(ui, { topics: TOPICS, topicId: "t1" }).kids[0]);
  assert.deepEqual(t1.map((r) => /is-active/.test(r.className)), [false, true, false]);
  const legacy = rowsOf(threadMenu(ui, { topics: TOPICS, topicId: "all" }).kids[0]);
  assert.deepEqual(legacy.map((r) => /is-active/.test(r.className)), [true, false, false]);
});

test("a file scope leaves no Topics row active; no '+' without chat access", () => {
  const t = threadMenu(ui, { topics: TOPICS, topicId: "t1", scopedNid: "f9", items: [{ file_nid: "f9", filename: "Q2" }] });
  assert.ok(rowsOf(t.kids[0]).every((r) => !/is-active/.test(r.className)));
  assert.ok(!walk(t).some((n) => n.service === "topic-new"));
});

test("File Threads and Download are unchanged", () => {
  const t = threadMenu(ui, { topics: [], items: [{ file_nid: "f1", filename: "Q2" }] });
  assert.ok(walk(t).some((n) => n.service === "thread-menu-file" && n.file_nid === "f1"));
  assert.ok(walk(t).some((n) => n.service === "download-chat-history"));
});

test("skin: section head row, emoji cell, labels at the Figma 14/1.2 dark", () => {
  const SRC = path.join(__dirname, "..", "src/drumee");
  const css = sass.compile(path.join(SRC, "builtins/window/folder/skin/index.scss"), { loadPaths: [SRC, path.join(SRC, "skin")], logger: sass.Logger.silent }).css.replace(/\s+/g, " ");
  const rule = (sel) => { const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}")); assert.ok(m, `missing ${sel}`); return m[1]; };
  assert.match(rule(".window-folder .window__thread-menu__section-head"), /justify-content: space-between/);
  assert.match(rule(".window-folder .window__thread-menu__row-emoji"), /flex: 0 0 auto/);
  assert.match(rule(".window-folder .window__thread-menu__section-label"), /font-size: 14px/);
  assert.match(rule(".window-folder .window__thread-menu__add"), /cursor: pointer/);
});

// Rail: Topics and File Threads share the height equally and each scrolls
// its own rows under a fixed heading.
test("sections are marked and their rows sit in a scrollable box", () => {
  const t = threadMenu(ui, { topics: TOPICS, items: [{ file_nid: "f1", filename: "Q2" }], variant: "rail", canCreateTopic: 1 });
  const topics = t.kids.find((k) => /__section--topics/.test(k.className || ""));
  const threads = t.kids.find((k) => /__section--threads/.test(k.className || ""));
  assert.ok(topics && threads);
  const rowsBox = topics.kids.find((k) => hasCls(k, "window__thread-menu__rows"));
  assert.ok(rowsBox, "topic rows are wrapped");
  assert.deepEqual(rowsBox.kids.map((k) => k.service), ["thread-menu-general", "topic-menu-topic", "topic-menu-topic"]);
  assert.ok(topics.kids.some((k) => hasCls(k, "window__thread-menu__section-head")), "heading outside the scroller");
  assert.ok(threads.kids.some((k) => hasCls(k, "window__thread-menu__rows")));
});

test("skin (rail): the two sections split the height and scroll inside", () => {
  const SRC = path.join(__dirname, "..", "src/drumee");
  const css = sass.compile(path.join(SRC, "builtins/window/folder/skin/index.scss"), { loadPaths: [SRC, path.join(SRC, "skin")], logger: sass.Logger.silent }).css.replace(/\s+/g, " ");
  const rule = (sel) => { const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}")); assert.ok(m, `missing ${sel}`); return m[1]; };
  const sec = rule(".window-folder .window__thread-menu__card--rail > .window__thread-menu__section--topics, .window-folder .window__thread-menu__card--rail > .window__thread-menu__section--threads");
  assert.match(sec, /flex: 1 1 0/);
  assert.match(sec, /min-height: 0/);
  const rows = rule(".window-folder .window__thread-menu__card--rail > .window__thread-menu__section--topics > .window__thread-menu__rows, .window-folder .window__thread-menu__card--rail > .window__thread-menu__section--threads > .window__thread-menu__rows");
  assert.match(rows, /overflow-y: auto/);
  assert.match(rows, /min-height: 0/);
  assert.match(rows, /flex: 1 1 0/);
});
