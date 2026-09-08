// Being removed from a workspace must not leave the user on a blank page, and
// the notice card must not cut its own button off.
//
// Both reported 2026-09-08 with screenshots. The landing: onWorkspaceClosed()
// resets the chrome and clears headlessLayer, which used to reveal the desk's
// home grid — that grid is retired, so what was left was a white page. The
// card: the viewport-resize handler animates an INLINE height onto the window,
// and the height it writes is the inner content box (190px), leaving out the
// card's own 20px + 24px padding; `overflow: hidden` then took those 44px off
// the bottom, through the action button.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const PUSH = join(ROOT, "src/drumee/modules/desk/wm/push.js");
const SKIN = join(ROOT, "src/drumee/builtins/window/info/skin/index.scss");

function lift(file, signature, globals = {}) {
  const src = readFileSync(file, "utf8");
  const m = src.match(
    new RegExp(`\\n {2}(?:async )?${signature.replace(/[()]/g, "\\$&")} \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`),
  );
  assert.ok(m, `${signature} not found`);
  const names = Object.keys(globals);
  const args = signature.slice(signature.indexOf("(") + 1, signature.lastIndexOf(")"));
  return new Function(
    ...names,
    `return function (${args}) {\n${m[1]}\n};`,
  )(...names.map((n) => globals[n]));
}

const _ = { isFunction: (f) => typeof f === "function" };

// ── the landing ───────────────────────────────────────────────────────────

function run(desk) {
  const warns = [];
  const open = lift(PUSH, "_openAnotherWorkspaceAfterRevoke()", { Desk: desk, _ });
  open.call({ warn: (...a) => warns.push(a) });
  return warns;
}

test("acknowledging opens the desk's own default workspace", () => {
  const calls = [];
  run({ _openDefaultWorkspace: (opt) => { calls.push(opt); return Promise.resolve(true); } });
  assert.equal(calls.length, 1);
});

test("the list is refetched, not served from the 60s cache", () => {
  // The workspace we were just removed from is still in the cached list; a
  // cached rows[0] can be the very hub the user has lost.
  const calls = [];
  run({ _openDefaultWorkspace: (opt) => { calls.push(opt); return Promise.resolve(true); } });
  assert.equal(calls[0].force, 1);
});

test("a rejected open is swallowed, never thrown at the user", () => {
  const warns = run({ _openDefaultWorkspace: () => Promise.reject(new Error("offline")) });
  assert.deepEqual(warns, []);
});

test("a throwing open is caught and only warned about", () => {
  const warns = run({
    _openDefaultWorkspace: () => {
      throw new Error("boom");
    },
  });
  assert.equal(warns.length, 1);
});

test("a desk without the method is left alone", () => {
  assert.doesNotThrow(() => run({}));
  assert.doesNotThrow(() => run(null));
});

test("the acknowledge path calls it only when the LAST workspace closed", () => {
  const src = readFileSync(PUSH, "utf8");
  const ack = src.slice(src.indexOf("acknowledgeWorkspaceAccessRevoked"));
  const guard = ack.slice(0, ack.indexOf("_openAnotherWorkspaceAfterRevoke"));
  // Still inside the closingWorkspace && !keepsWorkspace branch: with another
  // workspace tab still open, that tab keeps the chrome and nothing reopens.
  assert.match(guard, /closingWorkspace\s*&&\s*\n?\s*!keepsWorkspace/);
  // And it runs AFTER the chrome reset, not instead of it.
  assert.match(guard, /Desk\.onWorkspaceClosed\(\);/);
});

// ── the card ──────────────────────────────────────────────────────────────

test("the notice card's height cannot be overridden by inline geometry", () => {
  const css = readFileSync(SKIN, "utf8");
  const block = css.slice(css.indexOf('.window-info__ui[data-variant="notice"]'));
  const decl = block.slice(0, block.indexOf("max-width"));
  // Without !important the window manager's inline height wins and
  // overflow:hidden cuts the footer — that is the reported bug.
  assert.match(decl, /height:\s*auto\s*!important/);
});

test("the card still clips its corners, so the fix is the height and only the height", () => {
  const css = readFileSync(SKIN, "utf8");
  const block = css.slice(css.indexOf('.window-info__ui[data-variant="notice"]'));
  assert.match(block.slice(0, 2000), /overflow:\s*hidden/);
  // min-height was already pinned; height is what was missing from that list.
  assert.match(block.slice(0, 2000), /min-height:\s*0\s*!important/);
});
