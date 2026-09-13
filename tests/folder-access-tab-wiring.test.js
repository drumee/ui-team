const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

const SRC = fs.readFileSync(
  require.resolve("../src/drumee/builtins/window/folder/index.js"),
  "utf8",
);
const { showsFileGrid } = require("../src/drumee/builtins/window/folder/access-column");

// A class method's body: it opens on `\n  name(args) {\n` and closes on the first
// `\n  }\n` — nested blocks close on four spaces or more.
function methodBody(signature) {
  const esc = signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = SRC.match(new RegExp(`\\n  ${esc} \\{\\n([\\s\\S]*?)\\n  \\}\\n`));
  assert.ok(m, `${signature} not found`);
  return m[1];
}

test("the folder window requires the Access view module", () => {
  assert.match(
    SRC,
    /const \{ ACCESS_TAB, showAccessColumn, showsFileGrid \} = require\("\.\/access-column"\);/,
  );
});

test("switchView mounts the Access column for the access tab", () => {
  assert.match(
    SRC,
    /case ACCESS_TAB:\n(?:\s*\/\/.*\n)*\s*showAccessColumn\(this, view\);\n\s*return;/,
  );
});

test("the list/grid toggle stays on Access", () => {
  assert.match(SRC, /viewCtrl\.el\.dataset\.visible = showsFileGrid\(tab\) \? "1" : "0";/);
});

test("the files-splitter gutter is draggable on Access, not just Files", () => {
  const body = methodBody("_wireFilesSplitter(child)");
  assert.doesNotMatch(
    body,
    /view\.el\.dataset\.view !== "files"/,
    "must not gate the pointerdown handler on the Files tab alone",
  );
  assert.match(
    body,
    /!showsFileGrid\(view\.el\.dataset\.view\)/,
    "must gate the pointerdown handler on showsFileGrid",
  );
});

test("+ New stays on Access for a member who may create", () => {
  const run = new Function("require", "showsFileGrid", "_a", methodBody("syncNewCtrlVisibility()"));
  const fakeRequire = (name) => {
    if (name === "libs/over-limit") return { isLocked: () => false };
    throw new Error(`unexpected require ${name}`);
  };
  for (const [tab, expected] of [
    [undefined, "1"], ["files", "1"], ["access", "1"], ["chat", "0"], ["task", "0"],
  ]) {
    const el = { dataset: {} };
    const win = {
      activeTab: tab,
      canUpload: () => true,
      getPart: () => ({ el, mget: () => ({}), mset() {} }),
    };
    run.call(win, fakeRequire, showsFileGrid, { dataset: "dataset" });
    assert.equal(el.dataset.visible, expected, `tab ${tab}`);
  }
});

test("the split body records which view the column is switching from", () => {
  assert.match(SRC, /view\.el\.dataset\.fromView = prevTab \|\| "";\n\s*view\.el\.dataset\.view = tab;/);
});

test("every view switch and the split body's first paint replay the view entrance", () => {
  assert.match(SRC, /view\.el\.dataset\.view = tab;\n\s*this\._playViewEntrance\(view\);/);
  assert.match(SRC, /this\.__folderView = child;\n(?:\s*\/\/.*\n)*\s*this\._applyFilesSplit\(\);\n(?:\s*\/\/.*\n)*\s*this\._playViewEntrance\(child\);/);
});

test("_playViewEntrance restarts the stamp on every call and never clears it on a timer", (t) => {
  // The panels that need it most appear LATE: the task board is a lazy kind
  // (a placeholder until its chunk loads) and the schedule's first build is a
  // long task. A timed clear can run before either paints, so the stamp stays
  // until the next switch restarts it.
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const run = new Function("view", methodBody("_playViewEntrance(view)"));
  let reflows = 0;
  const dataset = {};
  const el = { dataset, get offsetWidth() { reflows++; return 0; } };
  const win = {};
  run.call(win, { el });
  assert.equal(dataset.viewEntering, "1");
  assert.equal(reflows, 1, "a reflow between removing and re-adding restarts the animation");
  t.mock.timers.tick(10000);
  assert.equal(dataset.viewEntering, "1", "still set long after the old 400ms clear");
  run.call(win, { el });
  assert.equal(dataset.viewEntering, "1");
  assert.equal(reflows, 2, "every switch restarts it");
  run.call(win, {});
});

// Access is on the same rail as Task, Chat and Meet, whose kinds are all
// warmed when the window opens — it was the only one left cold, so pressing it
// paid a round trip for the chunk before anything could even be asked of the
// server. The column shows nothing at all during that: the panel's loading
// skeleton lives on an element the chunk has not created yet.
test("the window warms the members panel's chunk with the rest of the rail", () => {
  const warmed = SRC.match(/for \(const kind of \[([\s\S]*?)\]\) \{/);
  assert.ok(warmed, "the rail warm-up list is gone");
  const kinds = warmed[1].match(/"([^"]+)"/g).map((s) => s.replace(/"/g, ""));
  assert.ok(kinds.includes("tasks_panel"), "sanity: the Task kind is warmed");
  assert.ok(kinds.includes("permission_restricted"), "Access is still cold");
});
