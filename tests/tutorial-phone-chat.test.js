// Chat tour, phone layout (Figma flow "Chat": 386:55913 → 386:57195).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");
const SRC = path.join(__dirname, "..", "src/drumee");
const Module = require("node:module");
const baseLoad = Module._load;
Module._load = function (r, p, m) {
  if (/^assets\//.test(r)) return `asset:${r}`; // webpack asset modules
  if (r === "media/grid/template/folder") return () => "<svg/>";
  return baseLoad.call(this, r, p, m);
};
const mk = (type) => new Proxy(function (o = {}) { return { type, ...o }; }, {
  get: (t, k) => (k in t ? t[k] : mk(`${type}.${String(k)}`)),
});
global.Skeletons = mk("S");
global.LOCALE = new Proxy({}, { get: (_, k) => String(k) });
global._a = new Proxy({}, { get: (_, k) => String(k) });
global._ = { uniqueId: (p) => `${p}1` };
const SCREENS = require(path.join(SRC, "modules/desk/tutorial/chat/screens.js"));
const view = require(path.join(SRC, "modules/desk/tutorial/chat/skeleton/phone.js"));
test.after(() => { Module._load = baseLoad; for (const k of ["Skeletons", "LOCALE", "_a", "_"]) delete global[k]; });

const ui = { fig: { family: "tutorial-chat", group: "tutorial" }, mget: () => null };
const find = (t, pn) => {
  if (!t || typeof t !== "object") return null;
  if (t.sys_pn === pn) return t;
  for (const k of t.kids || []) { const r = find(k, pn); if (r) return r; }
  return null;
};

test("every chat screen has a phone entry", () => {
  assert.equal(SCREENS.length, 5);
  assert.ok(SCREENS.every((s) => s.phone && s.phone.view && s.phone.target));
});

for (const [i, s] of SCREENS.entries()) {
  test(`chat phone screen ${i + 1}: the target exists`, () => {
    assert.ok(find(view(ui, s.phone), s.phone.target), s.phone.target);
  });
}

test("screen 2 lights the composer +, no halo, 18 clear, phone copy", () => {
  const p = SCREENS[1].phone;
  assert.equal(p.target, "ph-composer-plus");
  assert.ok(!p.halo);
  assert.equal(p.gap, 18);
  assert.equal(p.title(), "TUTORIAL_CHAT_PHONE_ATTACH_TITLE");
});

test("screen 3 is the message action sheet with Reply in thread lit", () => {
  const tree = view(ui, SCREENS[2].phone);
  assert.equal(SCREENS[2].phone.target, "ph-act-thread");
  assert.ok(find(tree, "ph-act-sheet"));
  assert.equal(SCREENS[2].phone.title(), "TUTORIAL_CHAT_PHONE_HOLD_TITLE");
});

test("the hero CTA advances the tour", () => {
  assert.equal(find(view(ui, SCREENS[0].phone), "ph-cta").service, "next-step");
});

test("index wires the phone skeleton", () => {
  const src = fs.readFileSync(path.join(SRC, "modules/desk/tutorial/chat/index.js"), "utf8");
  assert.match(src, /require\('\.\/screens'\)/);
  assert.match(src, /require\('\.\/skeleton\/phone'\)/);
});

test("every locale has the phone chat copy", () => {
  for (const l of ["en", "fr", "es", "ru", "zh", "km"]) {
    const j = require(path.join(__dirname, "..", "locale", `${l}.json`));
    for (const k of ["TUTORIAL_CHAT_PHONE_ATTACH_TITLE", "TUTORIAL_CHAT_PHONE_ATTACH_DESC", "TUTORIAL_CHAT_PHONE_HOLD_TITLE", "TUTORIAL_CHAT_PHONE_DISCUSS_TITLE"]) {
      assert.ok(j[k], `${l} ${k}`);
    }
  }
});

test("phone chat skin: own bubbles pink, sheet tiles", () => {
  const sass = require("sass");
  const css = sass.compile(path.join(SRC, "modules/desk/tutorial/chat/skin/index.scss"),
    { loadPaths: [SRC, path.join(SRC, "skin")] }).css.replace(/\s+/g, " ");
  assert.match(css, /\.tutorial-chat__ph-msg--own \.tutorial-chat__ph-bubble \{[^}]*background: #ffa8dc/);
  assert.match(css, /\.tutorial-chat__ph-tile\[data-lit="1"\] \{[^}]*background: #fff/);
  assert.match(css, /\.tutorial-phone\.tutorial-chat__phone \{[^}]*background: #f2f2f7/);
});

test("the last screen lights the whole composer row, the card above it", () => {
  const p = SCREENS[4].phone;
  assert.equal(p.target, "ph-composer-row");
  assert.equal(p.prefer, "above");
  assert.equal(p.title(), "TUTORIAL_CHAT_PHONE_DISCUSS_TITLE");
});

test("stream follows 386:56395: day pills, own reply first, no file message", () => {
  const tree = view(ui, SCREENS[1].phone);
  const body = JSON.stringify(tree);
  assert.match(body, /August 13/);
  assert.match(body, /August 14/);
  assert.doesNotMatch(body, /file chat thread start here/);
});

test("the screen stamps its view for the skin's fades", () => {
  assert.equal(view(ui, SCREENS[3].phone).dataset.view, "thread-open");
  assert.equal(view(ui, SCREENS[4].phone).dataset.view, "thread-reply");
});
