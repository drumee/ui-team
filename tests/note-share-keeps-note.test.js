// The Note stays on screen behind the Share panel (tester, 2026-10-30).
//
// Share opens window_secure_share, which takes the window-manager focus: the
// note's `data-state` drops to 0. The shared editor skin lifts only the ACTIVE
// editor (`.editor__ui[data-state="1"]` → 10000); with no resting level of its
// own the note fell to `z-index: auto`, under the workspace window it was
// opened from (z 1000), and came back only when the panel closed. The players
// never had this — `.player__ui` rests at 1000 — so the fix is the note's own
// skin, not the shared share widget.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "..");
const read = (f) => readFileSync(resolve(ROOT, f), "utf8");

// The body of the first `&__ui {` block after `.editor-blocknote {`, up to its
// first nested rule — the declarations that apply in every state.
function ownUiDeclarations(skin) {
  const root = skin.indexOf("\n.editor-blocknote {");
  assert.ok(root >= 0, "the note skin has its root rule");
  const ui = skin.indexOf("&__ui {", root);
  assert.ok(ui > root, "the root rule styles __ui");
  const body = skin.slice(ui + "&__ui {".length);
  return body.slice(0, body.search(/\n\s*&[\[:]/));
}

test("an inactive note rests at the players' level, not at auto", () => {
  const decl = ownUiDeclarations(read("src/drumee/builtins/editor/blocknote/skin/index.scss"));
  assert.match(decl, /\n\s*z-index: 1000;/);
  // Same resting level as every player, which stays visible behind the panel.
  const player = read("src/drumee/builtins/player/skin/index.scss");
  assert.match(player, /&__ui \{[^}]*z-index: 1000;/);
});

test("the active note is still lifted above everything (shared rule kept)", () => {
  const skin = read("src/drumee/builtins/editor/blocknote/skin/index.scss");
  assert.match(skin, /@use "\.\.\/\.\.\/skin\/topbar\.scss";/);
  const shared = read("src/drumee/builtins/editor/skin/topbar.scss");
  assert.match(shared, /&\[data-state="1"\] \{\s*z-index: 10000 !important;/);
  // Not !important at rest, so the active rule always wins.
  assert.doesNotMatch(ownUiDeclarations(skin), /z-index: 1000 !important/);
});

test("the shared share widget is untouched by this fix: players still float the panel", () => {
  const share = read("src/drumee/builtins/player/widget/share/index.js");
  assert.match(share, /service: "secure-share", floating: 1/);
});

// Round 2 (Duy, 2026-10-30): closing the floating panel slid it sideways
// before it vanished. It now goes on the spot; the folder's embedded drawer
// keeps its slide.
test("closing the floating secure-share panel has no slide-out", () => {
  const src = read("src/drumee/builtins/window/secure-share/index.js");
  const at = src.indexOf("case _e.close:");
  const body = src.slice(at, src.indexOf("return super.onUiEvent", at));
  assert.match(body, /if \(this\._floating\) return this\.selfDestroy\(\{ now: 1 \}\);/);
  // The slide (xPercent tween) is reached only by the embedded drawer.
  const floatAt = body.indexOf("this._floating");
  const embAt = body.indexOf("if (this._embedded)");
  const slideAt = body.indexOf("xPercent: 100");
  assert.ok(floatAt > 0 && embAt > floatAt && slideAt > embAt);
});
