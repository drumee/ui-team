// Renders the REAL daily-reminder skeleton against stub Skeletons/LOCALE/_
// globals and inspects the descriptor tree it returns.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const WIDGET = path.join(__dirname, "..", "src/drumee/builtins/widget/daily-reminder-popup");

// images.js requires .png through webpack; node cannot. Stub it in the cache.
const imagesPath = require.resolve(path.join(WIDGET, "images.js"));
require.cache[imagesPath] = {
  id: imagesPath, filename: imagesPath, loaded: true,
  exports: { heroFor: (p) => `/hero/${p}.png` },
};

const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y"), Z: node("Box.Z") },
  Note: node("Note"),
  Element: node("Element"),
  Image: { Svg: node("Image.Svg") },
  Button: { Svg: node("Button.Svg") },
};
const en = require("../locale/en.json");
// Mirrors createSafeObject: a missing key resolves to its own name.
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
global._ = { escape: (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") };

const skeleton = require(path.join(WIDGET, "skeleton"));

function ui({ name = "Iris", counts = { unread_messages: 51, due_tasks: 5, meetings: 2 }, period = "morning", now = new Date(2026, 8, 25, 9) } = {}) {
  return {
    fig: { family: "daily-reminder-popup" },
    getNow: () => now,
    getPeriod: () => period,
    getCounts: () => counts,
    getFirstName: () => name,
  };
}

function walk(n, out = []) {
  if (!n || typeof n !== "object") return out;
  out.push(n);
  for (const k of n.kids || []) walk(k, out);
  return out;
}
const byClass = (tree, cls) => walk(tree).filter((n) => String(n.className || "").split(/\s+/).includes(cls));
const one = (tree, cls) => {
  const hits = byClass(tree, cls);
  assert.equal(hits.length, 1, `expected one .${cls}, got ${hits.length}`);
  return hits[0];
};
const P = "daily-reminder-popup";

// Note IS a flex container: a bare text node beside the name <span> becomes
// two anonymous flex items and the space between them collapses
// ("Friday,Iris" — seen in the headless render). The whole title must be ONE
// inline element.
test("title greets by weekday, name highlighted, wrapped in one inline span", () => {
  const t = skeleton(ui());
  assert.equal(one(t, `${P}__title`).content,
    `<span class="${P}__title-text">Happy Friday, <span class="${P}__name">Iris</span>!</span>`);
});

test("no name → 'Happy Friday!' with no dangling comma or key name", () => {
  const t = skeleton(ui({ name: "" }));
  assert.equal(one(t, `${P}__title`).content, `<span class="${P}__title-text">Happy Friday!</span>`);
});

test("the name is escaped", () => {
  const t = skeleton(ui({ name: "<img onerror=x>" }));
  assert.match(one(t, `${P}__title`).content, /&lt;img onerror=x&gt;/);
});

test("stat tiles use the rail icons, numbers and plural labels", () => {
  const t = skeleton(ui({ counts: { unread_messages: 51, due_tasks: 1, meetings: 2 } }));
  const icos = byClass(t, `${P}__stat-ico`).map((n) => n.ico);
  assert.deepEqual(icos, ["rail-chat", "rail-task", "rail-meet"]);
  const nums = byClass(t, `${P}__stat-num`);
  assert.deepEqual(nums.map((n) => n.content), ["51", "1", "2"]);
  assert.deepEqual(nums.map((n) => n.attribute["data-count"]), ["51", "1", "2"]);
  assert.deepEqual(byClass(t, `${P}__stat-label`).map((n) => n.content),
    ["unread messages", "due task", "meetings today"]);
});

test("malformed counts render as non-negative integers", () => {
  const t = skeleton(ui({ counts: { unread_messages: "<b>", due_tasks: -3, meetings: 2.7 } }));
  assert.deepEqual(byClass(t, `${P}__stat-num`).map((n) => n.content), ["0", "0", "2"]);
});

test("all-zero day shows the empty line and no tiles", () => {
  const t = skeleton(ui({ counts: { unread_messages: 0, due_tasks: 0, meetings: 0 } }));
  assert.equal(one(t, `${P}__empty`).content, "Nothing due today");
  assert.equal(byClass(t, `${P}__stats`).length, 0);
  assert.equal(byClass(t, `${P}__stat-num`).length, 0);
});

test("period drives the card modifier, hero image and sub-line", () => {
  const t = skeleton(ui({ period: "evening", now: new Date(2026, 8, 26, 20) }));
  assert.ok(byClass(t, `${P}__card--evening`).length === 1);
  assert.equal(one(t, `${P}__hero`).attribute.src, "/hero/evening.png");
  assert.equal(one(t, `${P}__subline`).content, "A quick snapshot before you wind down");
  assert.equal(byClass(t, `${P}__bit`).length, 6);
});

test("Friday afternoon wraps up the week", () => {
  const t = skeleton(ui({ period: "afternoon", now: new Date(2026, 8, 25, 15) }));
  assert.match(one(t, `${P}__subline`).content, /wrap up the week/);
});

test("calendar row uses top-calendar and the calendar service", () => {
  const t = skeleton(ui());
  const row = one(t, `${P}__calrow`);
  assert.equal(row.service, "daily-reminder-calendar");
  assert.notEqual(row.active, 0);
  assert.equal(one(t, `${P}__calrow-ico`).ico, "top-calendar");
  assert.equal(one(t, `${P}__calrow-text`).content, "Check your calendar to see what's next");
});

test("buttons: Maybe later discards, Open my calendar opens, ✕ closes", () => {
  const t = skeleton(ui());
  const ghost = one(t, `${P}__btn--ghost`);
  const primary = one(t, `${P}__btn--primary`);
  assert.equal(ghost.content, "Maybe later");
  assert.equal(ghost.service, "daily-reminder-discard");
  assert.equal(primary.content, "Open my calendar");
  assert.equal(primary.service, "daily-reminder-calendar");
  const close = one(t, `${P}__close`);
  assert.equal(close.ico, "cross");
  assert.equal(close.service, "daily-reminder-close");
});

test("every node without a service is inactive, except the two layout boxes", () => {
  const t = skeleton(ui());
  const offenders = walk(t).filter((n) =>
    !n.service && n.active !== 0 &&
    !/__backdrop|__card\b/.test(n.className || ""));
  assert.deepEqual(offenders.map((n) => n.className), []);
});
