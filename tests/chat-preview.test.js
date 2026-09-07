// The chat tour's opening plate, drawn instead of photographed.
//
// It was assets/tutorial/chat-threads.png — 147KB of screenshot showing a pane
// this codebase already draws. A bitmap cannot follow the theme, and it goes
// stale the moment the pane moves, which is the failure that matters: the user
// sees the picture on screen 1 and the real thing on screen 2.
//
// The plate itself is the SAME component the create-workspace flow opens on
// (toolkit/app-preview.js), so the two screens cannot drift either.
const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { join } = require("node:path");
const { renderModule, find, findAll, walk } = require("./helpers/render-skeleton.js");

const ROOT = join(__dirname, "..");
const CHAT = "src/drumee/modules/desk/tutorial/chat/skeleton/index.js";
const WS = "src/drumee/modules/desk/tutorial/workspace/skeleton/index.js";

const chatUi = { fig: { family: "tutorial-chat", group: "tutorial" }, mget: () => null };
const wsUi = { fig: { family: "tutorial-workspace", group: "tutorial" }, mget: () => null };

const empty = () => renderModule(CHAT, chatUi, { empty: 1 });
const pane = (opt) => renderModule(CHAT, chatUi, opt || {});
const home = () => renderModule(WS, wsUi, { home: true }, {});

const lit = (t) =>
  findAll(t, "tutorial__pv-rail-item").filter((n) => n.attrOpt["data-active"] === 1);

test("the bitmap is gone, and nothing asks for it", () => {
  assert.ok(
    !existsSync(join(ROOT, "src/drumee/assets/tutorial/chat-threads.png")),
    "the asset is still on disk",
  );
  // The REQUIRE, not the name — the comment above previewPane says which
  // bitmap it replaced, and that sentence is worth keeping.
  const src = readFileSync(join(ROOT, CHAT), "utf8");
  assert.ok(!/require\([^)]*chat-threads/.test(src), "it is still being required");
});

test("the opening screen draws the plate, not an image", () => {
  const t = empty();
  const plate = find(t, "tutorial__pv-plate");
  assert.ok(plate, "no preview plate");
  // The carousel card brings its own 760x515 and its own clipping, so the
  // plate takes that box instead of the home screen's pinned one.
  assert.equal(plate.attrOpt["data-fit"], "card");
  assert.equal(findAll(t, "tutorial__es-card-img").length, 0, "an <img> is still drawn");
  for (const n of walk(t)) {
    assert.ok(!n.attribute || !n.attribute.src, `something still has a src: ${n.className}`);
  }
});

test("the lit tab is the screen inside it", () => {
  // A miniature showing Chat with Files lit is a miniature of nothing.
  const c = lit(empty());
  assert.equal(c.length, 1, "exactly one tab is lit");
  assert.equal(c[0].kids[1].content, "CHAT");

  const h = lit(home());
  assert.equal(h.length, 1);
  assert.equal(h[0].kids[1].content, "FILES", "the home plate must still show Files");
});

test("the plate shows the REAL pane, and the same one screen 2 shows", () => {
  const t = empty();
  const plate = find(t, "tutorial__pv-plate");
  for (const cls of ["tutorial-chat__pane", "tutorial-chat__rail",
                     "tutorial-chat__head", "tutorial-chat__stream"]) {
    assert.ok(find(plate, cls), `${cls} is missing from the plate`);
  }
  // Same fixture, same count as screen 2 — where the file message is likewise
  // held back until the gesture that introduces it.
  const inPlate = findAll(plate, "tutorial-chat__bubble").length;
  assert.equal(inPlate, 6);
  assert.equal(findAll(pane({}), "tutorial-chat__bubble").length, inPlate);
});

test("nothing inside the plate claims a part name", () => {
  // The step ensurePart()s by name, and the plate renders a second copy of a
  // pane that carries `chat-main`, `stream` and `msg-*`. Two parts by one name
  // is a coin toss over which the spotlight measures.
  const plate = find(empty(), "tutorial__pv-plate");
  const named = [...walk(plate)].filter((n) => n.sys_pn).map((n) => n.sys_pn);
  assert.deepEqual(named, [], `the plate registered parts: ${named}`);
});

test("the home plate still draws the Files grid", () => {
  // The default body, unchanged by the chat tour taking a parameter.
  const plate = find(home(), "tutorial__pv-plate");
  assert.ok(plate, "the home plate is gone");
  assert.ok(find(plate, "tutorial__fg-file"), "no files grid inside it");
  assert.ok(!plate.attrOpt["data-fit"], "the home plate keeps its own geometry");
});

test("an exported frame is still an exported frame", () => {
  // Task and Meet keep their bitmaps on purpose — those cards are rendered
  // mini-apps (donuts, bar charts) that redrawing would get permanently wrong.
  // This is the branch that serves them.
  const { installGlobals, installResolver } = require("./helpers/render-skeleton.js");
  const restoreG = installGlobals();
  const restoreR = installResolver();
  let out;
  try {
    delete require.cache[require.resolve(join(ROOT,
      "src/drumee/modules/desk/tutorial/skeleton/toolkit/empty-state.js"))];
    const { emptyState } = require(join(ROOT,
      "src/drumee/modules/desk/tutorial/skeleton/toolkit/empty-state.js"));
    out = emptyState(chatUi, { title: "t", desc: "d", cta: "c", items: [{ src: "shot.png" }] });
  } finally {
    restoreR();
    restoreG();
  }
  const img = find(out, "tutorial__es-card-img");
  assert.ok(img, "the image branch is gone");
  assert.equal(img.attribute.src, "shot.png");
});
