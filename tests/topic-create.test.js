// topic-create.test.js — the New Topic dialog (Figma 867:186725) and its
// emoji set: name + emoji, 9 tabs (search first), Cancel / Create, single-
// flight create through the host, TOPIC_EXISTS shown in place.
//
//   node --test tests/topic-create.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = { Box: { X: node("Box.X"), Y: node("Box.Y") }, Note: node("Note"), Entry: node("Entry"), Image: { Svg: node("Image.Svg") }, Button: { Svg: node("Button.Svg") } };
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
global._ = require("underscore");
global._a = new Proxy({}, { get: (t, k) => k });
global._e = new Proxy({}, { get: (t, k) => k });
global.LetcBox = class { initialize() {} declareHandlers() {} warn() {} };
const _load = Module._load;
Module._load = function (r, ...a) { if (r === "./skin") return {}; return _load.call(this, r, ...a); };

const E = require("../src/drumee/libs/topic-emojis");
const W = require("../src/drumee/builtins/widget/topic-create");
const sk = require("../src/drumee/builtins/widget/topic-create/skeleton");

const walk = (n, out = []) => { if (Array.isArray(n)) { n.forEach((k) => walk(k, out)); return out; } if (!n || typeof n !== "object") return out; out.push(n); (n.kids || []).forEach((k) => walk(k, out)); return out; };
const byService = (t, s) => walk(t).filter((n) => n.service === s);
const flush = () => new Promise((r) => setImmediate(r));

function widget(host) {
  const w = Object.create(W.prototype);
  const attrs = { folder_nid: "fA", hub_id: "h1", host };
  w.mget = (k) => attrs[k];
  w.fig = { family: "widget-topic-create", group: "widget" };
  w.fed = [];
  w.feed = (t) => w.fed.push(t);
  const parts = {};
  w.parts = parts;
  w.getPart = (pn) => (parts[pn] = parts[pn] || { pn, el: { dataset: {} }, fed: [], feed(t) { this.fed.push(t); }, set(o) { Object.assign(this, o); } });
  W.prototype.initialize.call(w, attrs);
  return w;
}
const entry = (value, service) => ({ mget: (k) => (k === "service" ? service : undefined), getValue: () => value });
const tap = (attrs) => ({ mget: (k) => attrs[k] });
function fakeHost(answer = { ok: true, topic: { id: "t1" } }) {
  const calls = [];
  let release;
  return {
    calls,
    closed: 0,
    pending: null,
    topicCreate(args) {
      calls.push(args);
      if (answer === "hold") return new Promise((r) => (release = () => r({ ok: true, topic: { id: "t1" } })));
      return Promise.resolve(answer);
    },
    release: () => release && release(),
    topicDialogClose() { this.closed++; },
  };
}

test("emoji groups: 8 categories, 18+ each, every entry has keywords", () => {
  assert.deepEqual(E.TOPIC_EMOJI_GROUPS.map((g) => g.key), ["smileys", "nature", "food", "travel", "activity", "objects", "symbols", "flags"]);
  for (const g of E.TOPIC_EMOJI_GROUPS) {
    assert.ok(g.emojis.length >= 18, g.key);
    assert.ok(g.ico, g.key);
    for (const [e, k] of g.emojis) assert.ok(e && k && k.trim().length > 0, `${g.key} ${e}`);
  }
  assert.deepEqual(E.TOPIC_EMOJI_GROUPS[0].emojis.slice(0, 9).map((x) => x[0]), ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂"]);
  assert.equal(E.DEFAULT_TOPIC_EMOJI, "😀");
});

test("search: 'smile' finds 😀 and 😊; '' returns []; no duplicates", () => {
  const r = E.searchTopicEmojis("Smile");
  assert.ok(r.includes("😀") && r.includes("😊"));
  assert.equal(new Set(r).size, r.length);
  assert.deepEqual(E.searchTopicEmojis(""), []);
  assert.deepEqual(E.searchTopicEmojis("   "), []);
});

test("skeleton: title New Topic, name field with placeholder, the selected emoji preview, 9 tabs (search first), Cancel + Create", () => {
  const w = widget(fakeHost());
  const t = sk(w);
  const notes = walk(t).filter((n) => n.type === "Note").map((n) => n.content);
  assert.ok(notes.includes(en.NEW_TOPIC));
  assert.ok(notes.includes(en.CHOOSE_TOPIC_ICON));
  const name = walk(t).find((n) => n.type === "Entry" && n.service === "topic-name");
  assert.equal(name.placeholder, en.TOPIC_NAME_PLACEHOLDER);
  assert.ok(walk(t).some((n) => n.sys_pn === "topic-preview" && n.content === "😀"));
  const tabs = byService(t, "topic-tab");
  assert.equal(tabs.length, 9);
  assert.equal(tabs[0].tab, "search");
  assert.equal(byService(t, "topic-emoji").length, E.TOPIC_EMOJI_GROUPS[0].emojis.length);
  assert.equal(byService(t, "topic-cancel").length, 1);
  assert.equal(byService(t, "topic-create").length, 1);
  assert.equal(byService(t, "topic-close").length, 1);
});

test("Create disabled (data-disabled=1) until the trimmed name is 1..60", () => {
  const w = widget(fakeHost());
  assert.equal(sk(w).kids.find((k) => k && /__actions/.test(k.className)).kids.find((k) => k.service === "topic-create").dataset.disabled, "1");
  w.onUiEvent(entry("  Design ", "topic-name"), { __inputStatus: "interactive" });
  assert.equal(w.getPart("topic-create-btn").el.dataset.disabled, "0");
  w.onUiEvent(entry("x".repeat(61), "topic-name"), { __inputStatus: "interactive" });
  assert.equal(w.getPart("topic-create-btn").el.dataset.disabled, "1");
  w.onUiEvent(entry("   ", "topic-name"), { __inputStatus: "interactive" });
  assert.equal(w.getPart("topic-create-btn").el.dataset.disabled, "1");
});

test("picking an emoji updates the preview and the selection; a tab switches the grid", () => {
  const w = widget(fakeHost());
  w.onUiEvent(tap({ service: "topic-emoji", emoji: "🔥" }), {});
  assert.equal(w._emoji, "🔥");
  assert.equal(w.getPart("topic-preview").el.innerText || w.getPart("topic-preview").content, "🔥");
  w.onUiEvent(tap({ service: "topic-tab", tab: "food" }), {});
  const grid = w.getPart("topic-grid").fed.at(-1);
  const food = E.TOPIC_EMOJI_GROUPS.find((g) => g.key === "food").emojis.map((x) => x[0]);
  assert.deepEqual(walk(grid).filter((n) => n.service === "topic-emoji").map((n) => n.emoji), food);
  w.onUiEvent(tap({ service: "topic-tab", tab: "search" }), {});
  w.onUiEvent(entry("smile", "topic-search"), { __inputStatus: "interactive" });
  const found = walk(w.getPart("topic-grid").fed.at(-1)).filter((n) => n.service === "topic-emoji").map((n) => n.emoji);
  assert.deepEqual(found, E.searchTopicEmojis("smile"));
});

test("Create is single-flight; TOPIC_EXISTS keeps the dialog open", async () => {
  const host = fakeHost("hold");
  const w = widget(host);
  w.onUiEvent(entry("Design", "topic-name"), { __inputStatus: "interactive" });
  w.onUiEvent(tap({ service: "topic-create" }), {});
  w.onUiEvent(tap({ service: "topic-create" }), {});
  assert.equal(host.calls.length, 1);
  assert.deepEqual(host.calls[0], { name: "Design", emoji: "😀" });
  host.release();
  await flush();
  assert.equal(host.closed, 1);

  const dup = fakeHost({ ok: false, status: "TOPIC_EXISTS" });
  const w2 = widget(dup);
  w2.onUiEvent(entry("Design", "topic-name"), { __inputStatus: "interactive" });
  await w2.onUiEvent(tap({ service: "topic-create" }), {});
  await flush();
  assert.equal(dup.closed, 0);
  const err = w2.getPart("topic-error");
  assert.equal(err.el.dataset.state, "1");
  assert.equal(err.content, en.TOPIC_EXISTS);
  // Editing the name clears the error.
  w2.onUiEvent(entry("Design 2", "topic-name"), { __inputStatus: "interactive" });
  assert.equal(err.el.dataset.state, "0");
});

test("Create ok closes the dialog through the host; Cancel and ✕ close without creating", async () => {
  for (const s of ["topic-cancel", "topic-close"]) {
    const host = fakeHost();
    const w = widget(host);
    w.onUiEvent(tap({ service: s }), {});
    assert.equal(host.closed, 1, s);
    assert.equal(host.calls.length, 0, s);
  }
});

test("Enter in the name field creates; Escape cancels", async () => {
  const host = fakeHost();
  const w = widget(host);
  w.onUiEvent(entry("Design", "topic-name"), { __inputStatus: "Enter" });
  await flush();
  assert.equal(host.calls.length, 1);
  const h2 = fakeHost();
  const w2 = widget(h2);
  w2.onUiEvent(entry("Design", "topic-name"), { __inputStatus: "cancel" });
  assert.equal(h2.closed, 1);
  assert.equal(h2.calls.length, 0);
});
