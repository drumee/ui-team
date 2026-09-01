#!/usr/bin/env node

/**
 * The workspace switcher stays OPEN when its rows are clicked.
 *
 * menu_topic closes on an item click only through _onItemClicked, whose switch
 * falls to `default: this._closeItems()` for any persistence it does not name —
 * which `once` is. `always` is the one value that returns early, so it is the
 * setting that disables the auto-close.
 *
 * The two other ways the menu closes are untouched by this, and both are
 * asserted below against the real widget source, because losing either would
 * strand the panel open:
 *
 *   - click outside: _onOutsideClick is bound to RADIO_CLICK in initialize and
 *     never consults persistence;
 *   - the caret: onUiEvent -> _onTriggerClicked -> _triggerToggle, which calls
 *     _closeItems directly.
 *
 * The one hazard is `brake`: _closeItems returns early when it is set, and it
 * is set from `origin.mget(persistence) === always`. That would disable the
 * outside-click path too — but only _close sets it, and nothing calls _close.
 *
 * Run from ui-team with:
 *   node --test tests/ws-menu-persistence.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const TOPBAR = read("src/drumee/modules/desk/skeleton/topbar.js");
const MENU = read("node_modules/@drumee/ui-core/letc/widgets/menu/index.js");

function slice(src, header) {
  const start = src.indexOf(header);
  assert.notEqual(start, -1, `${header} not found`);
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(start, j + 1);
  }
  assert.fail(`${header} unbalanced`);
}

const switcher = () => slice(TOPBAR, "function workspaceSwitcher(pfx, ui) {");

test("the switcher asks for the persistence that does not auto-close", () => {
  assert.match(switcher(), /persistence:\s*_a\.always/);
});

test("only `always` returns before _closeItems", () => {
  // Pins the reason: if the widget ever renames or reorders these cases, the
  // setting above stops meaning what its comment claims.
  const body = slice(MENU, "  _onItemClicked(child) {");
  assert.match(body, /case _a\.always:\s*return;/,
    "always must be the early return");
  assert.match(body, /default:\s*this\._closeItems\(\)/,
    "every unnamed persistence — `once` included — closes");
});

test("click-outside still closes, and does not consult persistence", () => {
  const init = slice(MENU, "  initialize(opt) {");
  assert.match(init, /RADIO_CLICK\.on\(_e\.click, this\._onOutsideClick\)/);
  const handler = init.slice(init.indexOf("this._onOutsideClick = "));
  assert.ok(!/persistence/.test(handler.slice(0, 600)),
    "the outside path must stay independent of persistence");
});

test("the caret still toggles it shut", () => {
  const body = slice(MENU, "  _triggerToggle(child, origin) {");
  assert.match(body, /this\._closeItems\(\)/);
  const ui = slice(MENU, "  onUiEvent(cmd) {");
  assert.match(ui, /_onTriggerClicked\(\)/, "the trigger has its own path");
  assert.ok(!/persistence/.test(ui), "which does not consult persistence either");
});

test("`brake` cannot disable the remaining close paths", () => {
  // _closeItems bails on brake, so if anything set it the menu would strand
  // open. brake is assigned only in _close, and _close has no caller.
  assert.match(slice(MENU, "  async _closeItems() {"), /if \(this\.brake\)\s*\{?\s*return/);
  const assigns = MENU.match(/this\.brake\s*=/g) || [];
  assert.equal(assigns.length, 1, "more than one writer — re-check this");
  assert.match(slice(MENU, "  _close(origin, e) {"), /this\.brake\s*=/,
    "the sole writer is _close");
  const calls = MENU.match(/(?<![_\w])this\._close\(/g) || [];
  assert.equal(calls.length, 0, "_close gained a caller: brake can now be set");
});

test("exactly the two menus that should be sticky are", () => {
  // The "+ New" menu (__add-wrapper) already used `always` before this change —
  // there was precedent in this very file. The switcher joins it; the remaining
  // topbar menus must stay `once`, or a blanket edit has gone through.
  const wrappers = [...TOPBAR.matchAll(/className:\s*`\$\{pfx\}__([a-z-]+wrapper)`/g)]
    .map((m) => m[1]);
  const sticky = wrappers.filter((w) => {
    const at = TOPBAR.indexOf(`__${w}\``);
    // Wide enough to clear the explanatory comment above `persistence`.
    return /persistence:\s*_a\.always/.test(TOPBAR.slice(at, at + 2500));
  });
  assert.deepEqual(sticky.sort(), ["add-wrapper", "ws-wrapper"],
    `unexpected sticky menus: ${sticky.join(", ")}`);
});
