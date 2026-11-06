// Note lists (tester, 2026-10-30): a multi-level bullet list drew a vertical
// guide line down every level. A level now shows by its indent and bullet only.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SKIN = fs.readFileSync(path.join(ROOT, "src/drumee/builtins/editor/blocknote/skin/index.scss"), "utf8");

test("nested levels draw no vertical guide line", () => {
  // BlockNote's own rule, which the skin has to beat.
  const bn = fs.readFileSync(path.join(ROOT, "node_modules/@blocknote/react/dist/style.css"), "utf8");
  assert.match(bn, /\.bn-block-outer:not\(\[data-prev-depth-changed\]\):before\{border-left:1px solid/);
  const at = SKIN.indexOf(".bn-block-group .bn-block-outer::before");
  assert.ok(at > 0);
  assert.match(SKIN.slice(at, at + 120), /border-left: none !important/);
  // Inside the editor's own scope, not app-wide.
  const scope = SKIN.lastIndexOf(".blocknote-state {", at);
  assert.ok(scope > 0 && SKIN.lastIndexOf(".bn-editor {", at) > scope);
});
