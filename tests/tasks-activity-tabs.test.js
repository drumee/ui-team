// tests/tasks-activity-tabs.test.js — the Activity header's All / Comments /
// History tabs (Figma 944:107305, "Activity detail" 2037-14883).
//
//   node --test tests/tasks-activity-tabs.test.js
//
// Runs the REAL _switchActivityTab against a stub `this`, reads the skeleton
// source for the tab row (it only loads under webpack), and compiles the REAL
// tasks skin for the visibility rules.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sass = require("sass");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const DIR = path.join(ROOT, "src/drumee/builtins/window/tasks");
const src = fs.readFileSync(path.join(DIR, "index.js"), "utf8");
const skel = fs.readFileSync(path.join(DIR, "skeleton/index.js"), "utf8");
const css = sass.compile(path.join(DIR, "skin/index.scss"), {
  loadPaths: [path.join(ROOT, "src/drumee"), path.join(ROOT, "src/drumee/skin"), path.join(ROOT, "skin")],
  style: "compressed",
  logger: sass.Logger.silent,
}).css;

// eslint-disable-next-line no-eval
const switchTab = eval(`(${sliceFunction(src, "_switchActivityTab(tab)")})`);

function stub() {
  const s = {
    fig: { family: "tasks-panel" },
    _activityTab: "comments",
    _detailId: 1,
    el: null,
    loads: 0,
    getTaskHistory: () => [],
    _loadTaskHistory() {
      s.loads++;
      return Promise.resolve();
    },
    _refreshHistoryList() {},
  };
  return s;
}

// The declarations of the compressed rule whose selector list holds `sel`.
// Compressed output unquotes identifier attribute values ([data-tab=all]) but
// keeps quotes on numeric ones ([data-empty="1"]), so compare unquoted.
const unq = (x) => x.replace(/="([A-Za-z_][\w-]*)"\]/g, "=$1]");
function declsFor(sel) {
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (m[1].split(",").map((x) => unq(x.trim())).includes(unq(sel))) out.push(m[2]);
  }
  return out.join(";");
}

test("All is a tab of its own and loads a missing change log", () => {
  const s = stub();
  switchTab.call(s, "all");
  assert.equal(s._activityTab, "all");
  assert.equal(s.loads, 1);
});

test("an unknown tab falls back to Comments", () => {
  const s = stub();
  s._activityTab = "history";
  switchTab.call(s, "bogus");
  assert.equal(s._activityTab, "comments");
});

test("tab row is All · Comments · History with the Figma glyphs", () => {
  const all = skel.indexOf('activityTab("all", LOCALE.ALL');
  const com = skel.indexOf('activityTab("comments"');
  const his = skel.indexOf('activityTab("history"');
  assert.ok(all > 0 && all < com && com < his);
  assert.match(skel, /activityTab\("comments", LOCALE\.COMMENTS, "ph-chat-circle-dots"\)/);
  assert.match(skel, /activityTab\("history", LOCALE\.HISTORY, "ph-arrow-counter-clockwise"\)/);
});

test("All shows both lists but drops an empty one only beside a filled one", () => {
  const p = '.tasks-panel__comments[data-tab="all"]';
  const s = ".tasks-panel__activity-section";
  // Hiding every empty section would blank the tab when both are empty (or
  // both still loading): only the empty half next to a non-empty one goes.
  assert.doesNotMatch(declsFor(`${p} ${s}[data-empty="1"]`), /display:none/);
  for (const [gone, kept] of [["comments", "history"], ["history", "comments"]]) {
    assert.match(
      declsFor(`${p}:has(${s}[data-kind="${kept}"][data-empty="0"]) ${s}[data-kind="${gone}"][data-empty="1"]`),
      /display:none/,
      gone,
    );
  }
  for (const k of ["comments", "history"]) {
    assert.doesNotMatch(declsFor(`${p} .tasks-panel__activity-section[data-kind="${k}"]`), /display:none/);
  }
  assert.match(declsFor(`${p} .tasks-panel__section-label`), /display:block/);
});

test("tab pills match Figma", () => {
  const d = declsFor(".tasks-panel__activity-tab");
  assert.match(d, /padding:9px 17\.5px/);
  assert.match(d, /height:35px/);
  assert.match(declsFor(".tasks-panel__activity-tabs"), /gap:0/);
});
