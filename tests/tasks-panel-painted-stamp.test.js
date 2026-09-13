// The task board stamps data-painted when it renders, so the folder window's
// Task entrance can wait for the board's FIRST PAINT. After a page refresh the
// board has nothing cached and draws nothing until task.list and the columns
// return; an entrance played on mount ran on an empty panel.
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

const SRC = fs.readFileSync(require.resolve("../src/drumee/builtins/window/tasks/index.js"), "utf8");
const m = SRC.match(/\n  _render\(\) \{\n([\s\S]*?)\n  \}\n/);

test("_render stamps data-painted on the board after it builds", () => {
  assert.ok(m, "_render not found");
  const run = new Function("require", m[1]);
  const order = [];
  const el = { dataset: {} };
  const board = {
    el,
    _captureFocus: () => null,
    _captureViewScroll: () => null,
    feed: () => { order.push(["feed", el.dataset.painted]); },
    _markPainted: () => {},
    _prepopulateInputs: () => {},
    _renderCommentBodies: () => {},
    _restoreViewScroll: () => {},
    _restoreFocus: () => {},
  };
  run.call(board, () => () => ({}));
  assert.equal(el.dataset.painted, "1");
  assert.deepEqual(order, [["feed", undefined]], "stamped after the feed, not before");
});
