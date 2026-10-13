// remote-display-stalled-skin.test.js — a stalled remote screen share (no
// frames for a while) is dimmed, so it doesn't pass for a live one.
//
//   node --test tests/remote-display-stalled-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/webrtc/endpoint/remote/display/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
    silenceDeprecations: ["import", "global-builtin", "mixed-decls", "color-functions", "legacy-js-api"],
    logger: sass.Logger.silent,
  })
  .css.replace(/\s+/g, " ");

test("data-stalled=1 dims the shared screen's video", () => {
  const m = css.match(/\.remote-display__ui\[data-stalled="1"\] video \{([^}]*)\}/);
  assert.ok(m, "missing stalled rule");
  assert.match(m[1], /opacity: 0\.45/);
});
