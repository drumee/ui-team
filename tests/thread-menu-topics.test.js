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

test("Topics section: label + '+', All / # General / topics in order", () => {
  const t = threadMenu(ui, { topics: TOPICS, topicId: "all", canCreateTopic: 1 });
  const first = t.kids[0];
  assert.ok(walk(first).some((n) => n.type === "Note" && n.content === en.TOPICS), "labelled Topics");
  assert.ok(!walk(t).some((n) => n.content === en.THIS_FOLDER), "no This Folder label");
  const plus = walk(first).find((n) => n.service === "topic-new");
  assert.ok(plus, "+ present");
  const rows = rowsOf(first);
  assert.deepEqual(rows.map((r) => r.service), ["topic-menu-all", "thread-menu-general", "topic-menu-topic", "topic-menu-topic"]);
  assert.equal(text(rows[0]), en.ALL);
  assert.equal(text(rows[1]), `# ${en.GENERAL}`);
  assert.match(text(rows[2]), /😀/);
  assert.match(text(rows[2]), /Design/);
  assert.equal(rows[2].topic_id, "t1");
  assert.equal(rows[2].topic_name, "Design");
  assert.ok(walk(rows[2]).some((n) => hasCls(n, "window__thread-menu__row-emoji") && n.content === "😀"));
});

test("only the current scope is active; badges only on topics with unread", () => {
  const all = rowsOf(threadMenu(ui, { topics: TOPICS, topicId: "all", canCreateTopic: 1 }).kids[0]);
  assert.deepEqual(all.map((r) => /is-active/.test(r.className)), [true, false, false, false]);
  const badge = (r) => walk(r).filter((n) => hasCls(n, "window__thread-menu__badge")).map((n) => n.content);
  assert.deepEqual(all.map(badge), [[], [], ["3"], []]);
  const t1 = rowsOf(threadMenu(ui, { topics: TOPICS, topicId: "t1" }).kids[0]);
  assert.deepEqual(t1.map((r) => /is-active/.test(r.className)), [false, false, true, false]);
  const gen = rowsOf(threadMenu(ui, { topics: TOPICS, topicId: "general" }).kids[0]);
  assert.deepEqual(gen.map((r) => /is-active/.test(r.className)), [false, true, false, false]);
  // Default (no topicId) = All.
  const def = rowsOf(threadMenu(ui, { topics: TOPICS }).kids[0]);
  assert.equal(/is-active/.test(def[0].className), true);
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
