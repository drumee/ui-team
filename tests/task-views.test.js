// The five tracker views, drawn instead of photographed.
//
// task-board / calendar / gantt / list / health .png were 386KB of screenshot
// showing five views this repo already draws: ./board, ./calendar, ./gantt,
// ./list and ./health have been on disk the whole time — their skin went when
// the tour moved onto the 2.0 shell and the bitmaps took over, and the
// builders were left with nothing to style them.
//
// What matters most about the replacement is that all five come from ONE
// dataset, so they cannot disagree with each other the way five screenshots
// can. That is what most of this file checks.
const test = require("node:test");
const assert = require("node:assert/strict");
const { existsSync, readFileSync } = require("node:fs");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");
const { renderModule, find, findAll, walk } = require("./helpers/render-skeleton.js");

const ROOT = join(__dirname, "..");
const TASK = "src/drumee/modules/desk/tutorial/task/skeleton";
const ui = { fig: { family: "tutorial-task", group: "tutorial" }, mget: () => null };

/**
 * Render one view with the globals its skeletons need, and hand the tree back.
 *
 * The globals have to stay installed for the CALL, not just for the require —
 * `taskPreview` builds Skeletons at call time.
 */
function preview(key) {
  const { installGlobals, installResolver } = require("./helpers/render-skeleton.js");
  const rg = installGlobals();
  const rr = installResolver();
  try {
    for (const k of Object.keys(require.cache)) if (/tutorial/.test(k)) delete require.cache[k];
    const { taskPreview } = require(join(ROOT, `${TASK}/preview.js`));
    return taskPreview(ui, key);
  } finally { rr(); rg(); }
}

test("the five bitmaps are gone, and nothing asks for them", () => {
  for (const n of ["board", "calendar", "gantt", "list", "health"]) {
    assert.ok(
      !existsSync(join(ROOT, `src/drumee/assets/tutorial/task-${n}.png`)),
      `task-${n}.png is still on disk`,
    );
  }
  const src = readFileSync(join(ROOT, `${TASK}/index.js`), "utf8");
  assert.ok(!/require\([^)]*task-\w+\.png/.test(src), "a bitmap is still required");
  // The two that stay are the Meet cards — those frames are photographs of a
  // video call, which is not something this codebase draws.
  assert.ok(existsSync(join(ROOT, "src/drumee/assets/tutorial/meet-schedule.png")));
});

test("the carousel hands the cards a composed node", () => {
  const src = readFileSync(join(ROOT, `${TASK}/index.js`), "utf8");
  assert.match(src, /node: taskPreview\(ui, v\.key\)/);
  assert.match(src, /taskPreview/);
});

test("all five draw from one dataset", () => {
  // The point of composing them. A task's name, status, priority and date are
  // written once; the board groups by status, the calendar places by date, the
  // gantt draws the span, the list tabulates and health counts.
  const data = require(join(ROOT, `${TASK}/data.js`));
  assert.equal(data.TOTAL, data.TASKS.length);
  const split = data.statusBreakdown();
  assert.equal(split.reduce((n, s) => n + s.count, 0), data.TOTAL,
    "the donut's arcs must add up to the total it prints in its hole");
  assert.equal(data.byStatus("todo").length + data.byStatus("progress").length
    + data.byStatus("review").length + data.byStatus("done").length, data.TOTAL);
  // Percentages are derived, not typed.
  for (const s of split) assert.equal(s.pct, Math.round((s.count / data.TOTAL) * 100));
});

test("the tabs are the product's own, not a second set of words", () => {
  // A tour that names the tabs differently from the panel it introduces
  // teaches the wrong words.
  const mine = readFileSync(join(ROOT, `${TASK}/preview.js`), "utf8");
  const real = readFileSync(
    join(ROOT, "src/drumee/builtins/window/tasks/skeleton/index.js"), "utf8");
  const defs = real.slice(real.indexOf("const viewDefs = ["), real.indexOf("];", real.indexOf("const viewDefs = [")));
  for (const [, , label, ico] of [...defs.matchAll(/\["(\w+)", (LOCALE\.\w+), "([\w-]+)"\]/g)]) {
    assert.ok(mine.includes(label), `${label} is not the tour's label`);
    assert.ok(mine.includes(`'${ico}'`), `${ico} is not the tour's icon`);
  }
});

test("every locale key the views name exists", () => {
  // These builders sat unused for a release; a key that went away in the
  // meantime would render as its own name on screen.
  const en = JSON.parse(readFileSync(join(ROOT, "locale/en.json"), "utf8"));
  const used = new Set();
  for (const f of ["board", "calendar", "gantt", "list", "health", "parts", "preview", "index"]) {
    const src = readFileSync(join(ROOT, `${TASK}/${f}.js`), "utf8");
    for (const m of src.matchAll(/LOCALE\.([A-Z_0-9]+)/g)) used.add(m[1]);
  }
  assert.ok(used.size > 20, `expected the views to name many keys, saw ${used.size}`);
  const missing = [...used].filter((k) => !(k in en));
  assert.deepEqual(missing, [], `missing locale keys: ${missing}`);
});

test("the views are scenery — nothing in a card is pressable", () => {
  // The carousel owns every control on that screen; a card that answers a
  // click would move the track under the user.
  for (const key of ["board", "calendar", "gantt", "list", "health"]) {
    const t = preview(key);
    for (const n of walk(t)) {
      assert.ok(!n.service, `${key}: ${n.className} raises ${n.service}`);
      assert.ok(!n.sys_pn || n.sys_pn === undefined, `${key}: ${n.className} claims a part name`);
    }
  }
});

test("each card shows its own view, with its own tab lit", () => {
  for (const [key, cls] of [["board", "tutorial-task__board"], ["calendar", "tutorial-task__cal"],
                            ["gantt", "tutorial-task__gt"], ["list", "tutorial-task__ls"],
                            ["health", "tutorial-task__ph"]]) {
    const t = preview(key);
    assert.ok(find(t, cls), `${key} did not draw ${cls}`);
    const active = findAll(t, "tutorial-task__view").filter((v) => /active/.test(v.className));
    assert.equal(active.length, 1, `${key} lit ${active.length} tabs`);
    assert.equal(find(t, "tutorial-task__tp-scale").attrOpt["data-view"], key);
  }
});

test("the plate is the frames' own geometry", () => {
  const css = execFileSync(
    "sass",
    ["-I", ".", "-I", "skin", "--no-source-map", "modules/desk/tutorial/task/skin/preview.scss"],
    { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 },
  );
  // 39 left / 36 top inside the 391x381 card, measured off all five frames —
  // they agree to the pixel.
  assert.match(css, /\.tutorial-task__tp-plate \{[^}]*padding: 36px 0 0 39px/);
  // 0.62: the frames' view tab is 21px tall against the 34 the skin draws.
  assert.match(css, /\.tutorial-task__tp-scale \{[^}]*transform: scale\(0\.62\)/);
});

test("the active tab is a pill, not a filled button", () => {
  const css = execFileSync(
    "sass",
    ["-I", ".", "-I", "skin", "--no-source-map", "modules/desk/tutorial/task/skin/views.scss"],
    { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 },
  );
  const rule = /\.tutorial-task__view\.active \{([^}]*)\}/.exec(css);
  assert.ok(rule, "the active tab is unstyled");
  assert.match(rule[1], /rgba\(89, 80, 255, 0\.1\)/, "the frames tint it, they do not fill it");
  assert.ok(!/var\(--white\)/.test(rule[1]), "white copy on a filled pill is the old 1.x tab");
});
