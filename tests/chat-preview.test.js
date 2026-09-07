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
const { execFileSync } = require("node:child_process");
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

// ── matching the frame (142:39142) ──────────────────────────────────────────

test("the message surface is grey and the bubbles are not", () => {
  // THE ONE THAT MATTERED. The stream took the pane's white, and white
  // bubbles on it vanished: what the frame draws as cards on a ground
  // rendered as text on a blank page. Asserted as a RELATION — the two must
  // differ — because either token moving is only a bug if they meet.
  const css = execFileSync(
    "sass",
    ["-I", ".", "-I", "skin", "--no-source-map", "modules/desk/tutorial/chat/skin/index.scss"],
    { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 },
  );
  const bg = (cls) => {
    const m = new RegExp(`\\.tutorial-chat__${cls} \\{([^}]*)\\}`).exec(css);
    assert.ok(m, `no rule for ${cls}`);
    const b = /background: ([^;]+);/.exec(m[1]);
    return b && b[1].trim();
  };
  assert.equal(bg("main"), "var(--normal-bg-90)", "the message column must carry the ground");
  assert.equal(bg("bubble"), "var(--normal-bg-elevated)");
  assert.notEqual(bg("main"), bg("bubble"), "a bubble the colour of its ground is invisible");
  // The folder column keeps the pane's white beside it.
  assert.equal(bg("pane"), "var(--normal-bg-elevated)");
  // And the tail corner the frame draws: square where the avatar is.
  assert.match(css, /\.tutorial-chat__bubble \{[^}]*border-radius: 0 16px 16px 16px/);
});

test("the open folder is marked in brand, not in the ground's own grey", () => {
  const css = execFileSync(
    "sass",
    ["-I", ".", "-I", "skin", "--no-source-map", "modules/desk/tutorial/chat/skin/index.scss"],
    { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 },
  );
  const row = /\.tutorial-chat__rail-row\[data-active="1"\] \{([^}]*)\}/.exec(css);
  assert.ok(row, "the active row is unstyled");
  assert.match(row[1], /rgba\(89, 80, 255, 0\.1\)/, "the frame tints it purple");
  // Every glyph the column LISTS is brand-tinted; the footer's utility is not.
  assert.match(css, /\.tutorial-chat__rail-ico \{[^}]*color: var\(--primary-purple-40\)/);
  assert.match(css, /\.tutorial-chat__rail-foot \.tutorial-chat__rail-ico \{[^}]*color: var\(--normal-fg-20\)/);
});

test("the org's picture is round", () => {
  // 8px made it read as another tile like the department's beside it.
  const css = execFileSync(
    "sass",
    ["-I", ".", "-I", "skin", "--no-source-map", "modules/desk/tutorial/skin/preview.scss"],
    { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 },
  );
  assert.match(css, /\.tutorial__pv-tb-org-avatar \{[^}]*border-radius: 50%/);
});

test("the folder lists three threads, and one is unread", () => {
  const rows = findAll(empty(), "tutorial-chat__rail-row");
  assert.equal(rows.length, 4, "the open folder plus its threads");
  assert.equal(rows[0].attrOpt["data-active"], 1, "the folder is the selected one");
  assert.equal(rows[0].attrOpt["data-divided"], 1, "and is ruled off from the threads");
  const names = rows.slice(1).map((r) => r.kids[1].content);
  assert.deepEqual(names, ["Drumee_Strategy_Q2", "Drumee_Reddit_Content", "2_Drumee_Premium_Visual02"]);
  const badges = rows.map((r) => findAll(r, "tutorial-chat__rail-badge").map((b) => b.content)[0]);
  assert.deepEqual(badges, ["90", undefined, undefined, "34"]);
});

test("the opening message keeps the break the design composed", () => {
  // Left to wrap it landed one word off — "folder. Please" ran together and
  // the last sentence was orphaned. Three lines, and the filename opens the
  // second one.
  const first = findAll(empty(), "tutorial-chat__msg-text")[0];
  assert.ok(first, "no message text");
  assert.equal(first.__kind, "element", "a Note renders its content as text, breaks included");
  const lines = first.content.split("<br>");
  assert.equal(lines.length, 3);
  assert.match(lines[0], /the latest$/);
  assert.match(lines[1], /^<span class="tutorial-chat__msg-link">Drumee_Strategy_Q2\.pdf<\/span>/);
  assert.match(lines[2], /^Please take a look/);
  // The link survived the split, once.
  assert.equal(first.content.split("tutorial-chat__msg-link").length - 1, 1);
});

test("the bubble's box is the frame's, not a guess", () => {
  // Read off the base image, which pins all three numbers at once: every
  // incoming bubble measures 204-206 image-px wide whatever it says, the
  // three-line one is 45 image-px tall and the two-line one 34, and the image
  // renders the pane's 285px folder column at 181 — a scale of 0.635.
  //
  //   width   205 / 0.635 = 323  -> 320, the same for all of them, so a fixed
  //                                width rather than a cap they reach
  //   line    (45 - 34) / 0.635  = 17.3 -> 1.25 of 14px
  //   padding (34 - 2*17.5) / 2 / 0.635 = 9 vertical; the first glyph starts
  //           10.5 image-px in -> 16 horizontal
  const css = execFileSync(
    "sass",
    ["-I", ".", "-I", "skin", "--no-source-map", "modules/desk/tutorial/chat/skin/index.scss"],
    { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 },
  );
  const bubble = /\.tutorial-chat__bubble \{([^}]*)\}/.exec(css);
  assert.ok(bubble, "no bubble rule");
  assert.match(bubble[1], /width: 320px/, "the design gives the column one width");
  assert.match(bubble[1], /max-width: 100%/, "and the 510px thread panel needs the cap");
  assert.match(bubble[1], /padding: 9px 16px/, "square padding is not what the frame draws");
  assert.match(css, /\.tutorial-chat__msg-text \{[^}]*line-height: 1\.25/);
});

test("the carets are affordances, not headlines", () => {
  // At --normal-fg they weighed the same as the name they sit beside. The base
  // image's darkest caret pixel is #86868d against this token's #84848c.
  const css = execFileSync(
    "sass",
    ["-I", ".", "-I", "skin", "--no-source-map", "modules/desk/tutorial/skin/preview.scss"],
    { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 },
  );
  assert.match(css, /\.tutorial__pv-tb-caret \{[^}]*color: var\(--normal-fg-50\)/);
});
