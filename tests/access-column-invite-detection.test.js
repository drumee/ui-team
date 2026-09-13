const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

// These four files detect "the invite panel is on screen" with a selector
// containing `.permission-restricted__main`. The rail's Access mounts that
// same panel in column mode (mode: "column", data-mode="column" on its root)
// once per workspace window and leaves it in the DOM (hidden by CSS) after
// the user navigates away — so a bare selector matches it forever. Every such
// selector must exclude column mode.
const FILES = [
  "../src/drumee/builtins/widget/activate-workspace/guide-invite.js",
  "../src/drumee/builtins/widget/reward-flow/index.js",
  "../src/drumee/builtins/widget/activate-workspace/guide-create.js",
  "../src/drumee/builtins/widget/reward-flow/guide.js",
];

const NOT_COLUMN = /:not\(\[data-mode="column"\]\)/;

for (const rel of FILES) {
  test(`${rel} excludes column mode from every permission-restricted__main selector`, () => {
    const src = fs.readFileSync(require.resolve(rel), "utf8");
    // Line-based, not a balanced-quote regex over the whole file: a generic
    // quote-matching scan can span from an unrelated apostrophe in a comment
    // all the way to some later quote and pick up an unrelated `:not(...)`
    // along the way, passing for the wrong reason. A selector and its guard
    // live on one line in all four files, so per-line is exact.
    const lines = src.split("\n").filter((l) => l.includes("permission-restricted__main"));
    assert.ok(lines.length > 0, "no permission-restricted__main selector found");
    for (const line of lines) {
      assert.match(
        line,
        NOT_COLUMN,
        `line must exclude column mode: ${line.trim()}`,
      );
    }
  });
}
