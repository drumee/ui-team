#!/usr/bin/env node

/**
 * Contextual sub-tours — desk/wm/sidebar wiring.
 *
 * These are STRUCTURAL assertions read from the production sources, in the same
 * style as harness-hygiene.test.js. They exist because the two properties below
 * are invisible at runtime when wrong — the tour still appears, and only the
 * thing it was supposed to leave alone quietly stops working:
 *
 *   - a trigger raised BEFORE the action it accompanies swallows that action
 *     (hard requirement 1). The tour looks fine; the workspace never opens.
 *   - single-flight released INSIDE the post-home chain gate leaks the guard
 *     for every contextual tour, because those tours return before the gate.
 *     The first tour works; nothing ever fires again that session.
 *
 * Run from ui-team with:
 *   node --test tests/tutorial-tours-wiring.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
// Comments are stripped before any ordering is read: these files explain
// themselves at length, and a method named in a comment above the code that
// calls it would otherwise be found first. (The `[^:]` guard keeps `https://`
// from ending a line early — same idiom as harness-hygiene.test.js.)
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const read = (p) => stripComments(readFileSync(join(REPO_ROOT, p), "utf8"));

const DESK = read("src/drumee/modules/desk/index.js");
const WM = read("src/drumee/modules/desk/wm/index.js");
const SIDEBAR = read("src/drumee/modules/desk/workspace-list/index.js");
const TUTORIAL = read("src/drumee/modules/desk/tutorial/index.js");
const WIN_FOLDER = read("src/drumee/builtins/window/folder/index.js");
const WIN_TOOLKIT = read("src/drumee/builtins/window/skeleton/toolkit/index.js");

/** The body of one `case "x": { ... }` block. */
function caseBlock(src, label) {
  const start = src.indexOf(`case "${label}":`);
  assert.notEqual(start, -1, `case "${label}" not found`);
  let depth = 0;
  let i = src.indexOf("{", start);
  assert.notEqual(i, -1, `case "${label}" is not a block`);
  const from = i;
  for (; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return src.slice(from, i + 1);
    }
  }
  throw new Error(`unterminated case "${label}"`);
}

// ── hard requirement 1: the trigger never swallows the action ────────────────

test("wm fires the folder tour AFTER openContent, never before", () => {
  const block = caseBlock(WM, "open-node");
  const open = block.indexOf("this.openContent(cmd, args)");
  const fire = block.indexOf('fire("folder_task"');
  assert.notEqual(open, -1, "openContent call not found");
  assert.notEqual(fire, -1, "folder trigger not found");
  assert.ok(open < fire, "the tour must not pre-empt the navigation");
});

test("wm discriminates on the MODEL's filetype, not on a section element", () => {
  const block = caseBlock(WM, "open-node");
  assert.match(block, /cmd\.mget\s*&&\s*cmd\.mget\(_a\.filetype\)/);
  assert.match(block, /_a\.hub\b/);
  assert.match(block, /_a\.folder\b/);
  // Tiles are physically re-appended into .workspace-section/.folder-section by
  // _doPartition under a live MutationObserver, so the DOM says nothing
  // reliable about what a tile is.
  assert.ok(!/workspace-section|folder-section|file-section/.test(block));
});

test("the sidebar fires on both of its open routes", () => {
  // loadWorkspace alone is not enough: a sub-folder row opens a folder WINDOW.
  assert.match(SIDEBAR, /case "load-workspace":[\s\S]*?fire\("folder_task"/);
  assert.match(SIDEBAR, /case "load-folder":[\s\S]*?fire\("folder_task"/);
});

test("the sidebar fires after handing off to Wm, not instead of it", () => {
  const block = caseBlock(SIDEBAR, "load-workspace");
  assert.ok(
    block.indexOf("Wm.loadWorkspace(target)") < block.indexOf('fire("folder_task"'),
  );
});

// ── single-flight release ────────────────────────────────────────────────────

test("desk releases the guard for EVERY tour, outside the chain gate", () => {
  const block = caseBlock(DESK, "desk-tutorial");
  const release = block.indexOf(".release(");
  const gate = block.search(/if \(tour !== "workspace" && tour !== "full"\) return;/);
  assert.notEqual(release, -1, "release() not wired on the tutorial's destroy");
  assert.notEqual(gate, -1, "the post-home chain gate is missing");
  assert.ok(
    release < gate,
    "a contextual tour returns at the gate; releasing after it leaks the guard",
  );
  assert.match(block, /child\.once\(_e\.destroy/);
});

test("the post-home chain is gated to the post-onboarding and full tours", () => {
  const block = caseBlock(DESK, "desk-tutorial");
  const gate = block.indexOf('if (tour !== "workspace" && tour !== "full") return;');
  for (const call of ["_chainRewardFlowAfterTutorial", "_chainHelpReturnAfterTutorial"]) {
    assert.ok(block.indexOf(call) > gate, `${call} must sit behind the gate`);
  }
  // The 20s fallback belongs to the same branch and must not be cancelled by a
  // contextual tour arriving later.
  assert.ok(block.indexOf("_homeSettledFallback") > gate);
});

// ── the + New trigger ────────────────────────────────────────────────────────

test("the + New menu triggers on _e.open, which never fires on close", () => {
  const block = caseBlock(DESK, "addmenu");
  assert.match(block, /child\.on\(_e\.open,/);
  assert.match(block, /fire\("migrate"/);
  // No state on the node or the widget: _updateAddmenu and _onOverLimitChanged
  // re-feed the whole fragment, and anything remembered here would be lost.
  assert.ok(!/dataset\./.test(block), "no trigger state on the DOM node");
});

test("the folder window's + New is the migrate tour's second entry point", () => {
  // Same gesture, same flag: whichever of the two is pressed first runs the
  // tour and the other then finds it seen. Nothing here dedupes them — that is
  // Tours.fire's job, and doing it at either call site would break the moment
  // a third entry point appeared.
  const start = WIN_FOLDER.indexOf('if (pn === "new-menu")');
  assert.notEqual(start, -1, "the folder window must listen for its + New menu");
  const block = WIN_FOLDER.slice(start, WIN_FOLDER.indexOf("\n    }", start));
  assert.match(block, /child\.on\(_e\.open,/, "open, not a click on the wrapper");
  assert.match(block, /fire\("migrate", this\)/);
  assert.ok(!/dataset\./.test(block), "no trigger state on the DOM node");
});

test("the + New menu is a part, or the folder window cannot reach its open", () => {
  // The wrapper (`new-ctrl`) is a plain box and has no open state, so listening
  // there would mean falling back to a DOM click — which also fires on the
  // control's padding, and on closing.
  assert.match(WIN_TOOLKIT, /sys_pn: "new-menu"[\s\S]{0,40}partHandler: ui/);
  // And the wrapper keeps its own part: syncNewCtrlVisibility still needs it.
  assert.match(WIN_TOOLKIT, /sys_pn: "new-ctrl"/);
});

test("both migrate entry points warm the chunk before it is needed", () => {
  // Whichever surface the user meets first should render the tour from memory.
  for (const [src, label] of [[caseBlock(DESK, "addmenu"), "desk topbar"],
    [WIN_FOLDER.slice(WIN_FOLDER.indexOf('if (pn === "new-menu")')), "folder topbar"]]) {
    assert.ok(/Kind\.waitFor\("tutorial_migrate"\)/.test(src), `${label} must prefetch`);
  }
});

// ── the host marks on mount, and only on mount ───────────────────────────────

test("the tour host marks seen and disarms the fetch guard in onDomRefresh", () => {
  const start = TUTORIAL.indexOf("  onDomRefresh() {");
  assert.notEqual(start, -1);
  const block = TUTORIAL.slice(start, TUTORIAL.indexOf("\n  }\n", start));
  assert.match(block, /Tours\.armed\(\)/);
  assert.match(block, /Tours\.markSeen\(this\._tour\.flag, this\)/);
  // Guarded on the flag (`full` and `meeting` are never recorded) AND on
  // preview, so a ?tutorial= look does not burn the real trigger.
  assert.match(block, /if \(this\._tour\.flag && !this\.mget\('preview'\)\)/);
});

test("markSeen is never called from a trigger site", () => {
  // A TRIGGER site must only fire: marking there burns a tour whose chunk fails
  // to load. wm and the sidebar are pure trigger sites and must stay clean.
  for (const [name, src] of [["wm", WM], ["sidebar", SIDEBAR]]) {
    assert.ok(!/markSeen\(/.test(src), `${name} must not mark a tour seen`);
  }

  // The desk gained ONE legitimate call in phase 3: closing the onboarding
  // wizard records `workspace` without mounting anything, because that path has
  // no tour to mark on mount and the wizard can reappear. It is not a trigger
  // site — it never calls fire(). Pin it to that case so a future marker added
  // beside a real trigger still fails here.
  const calls = [...DESK.matchAll(/markSeen\(/g)].map((m) => m.index);
  const from = DESK.indexOf('case "onboarding-completed":');
  const to = DESK.indexOf("\n      case ", from + 1);
  assert.notEqual(from, -1, "the onboarding-skip case moved");
  for (const at of calls) {
    assert.ok(
      at > from && at < to,
      "the desk may only mark a tour seen from the onboarding-skip path",
    );
  }
});

test("completing the full tour records every flagged tour", () => {
  const start = TUTORIAL.indexOf("  _enterWorkspace() {");
  assert.notEqual(start, -1);
  const block = TUTORIAL.slice(start, TUTORIAL.indexOf("\n  }\n", start));
  assert.match(block, /this\._tour\.id === 'full'/);
  assert.match(block, /for \(const id of flaggedIds\(\)\) Tours\.markSeen\(id, this\)/);
  // The legacy boolean is still written: an older client reads it, and the
  // pre-existing-user inference depends on it.
  assert.match(block, /tutorial_done: true/);
});

// ── the channel is bound and unbound ─────────────────────────────────────────

test("the desk binds the tour channel and releases it on teardown", () => {
  const on = DESK.match(/RADIO_BROADCAST\.on\(require\("libs\/tutorial-tours"\)\.CHANNEL/g);
  const off = DESK.match(/RADIO_BROADCAST\.off\(require\("libs\/tutorial-tours"\)\.CHANNEL/g);
  assert.equal(on && on.length, 1);
  assert.equal(off && off.length, 1, "an unbound listener outlives the desk");
});

test("only the desk listens on the channel", () => {
  for (const [name, src] of [["wm", WM], ["sidebar", SIDEBAR]]) {
    assert.ok(!/RADIO_BROADCAST\.on\(.*tutorial-tours/.test(src), `${name} must not listen`);
  }
});
