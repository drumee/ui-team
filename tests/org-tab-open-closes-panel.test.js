// "Open" shuts the dropdown, and is not offered from the screen it opens.
//
// The panel does not shut itself: `persistence: _a.always` (org-tab skeleton)
// is what stops a click inside it from closing it, and that exists for the
// inline rename — an entry the user is typing in must not be yanked away. Open
// is the one row where that is wrong, because it navigates: the panel was left
// hanging over the organisation screen it had just opened.
//
// Hiding the pill on that screen is a separate concern and lives with the rest
// of the chrome the org screen suppresses — see
// tests/org-screen-hides-desk-chrome.test.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const TAB = join(ROOT, "src/drumee/modules/desk/org-tab/index.js");
const MENU = join(ROOT, "node_modules/@drumee/ui-core/letc/widgets/menu/index.js");

// The lift from tests/crumb-loading.test.js, with one addition: `super.` is a
// SyntaxError outside a class body, and both handlers below end on
// `if (super.onUiEvent) super.onUiEvent(...)`. It is rewritten to a plain
// property so the REAL switch/case runs; the stub supplies `__super__` and the
// tests assert on the branches, not on that fallthrough.
function lift(file, signature, params = [], args = []) {
  const src = readFileSync(file, "utf8");
  const re = new RegExp(
    `\\n {2}${signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`,
  );
  const m = src.match(re);
  assert.ok(m, `${signature} not found in ${file}`);
  const body = m[1].replace(/\bsuper\./g, "this.__super__.");
  const inner = signature.slice(signature.indexOf("("));
  return new Function(...params, `return function ${inner} {\n${body}\n};`)(...args);
}

const lodash = require("lodash");
// `_a.service` is the key onUiEvent reads off the view when args carries none.
const A = new Proxy({}, { get: (_t, k) => String(k) });

function tabStub(over = {}) {
  const log = [];
  const self = {
    __super__: {},
    _menu: { el: {}, isDestroyed: () => false, _triggerToggle: () => log.push("close") },
    // THE REAL METHOD, not a spy: the chain under test is
    // onUiEvent -> _closeMenu -> the menu's own _triggerToggle, and a stubbed
    // middle would pass while _closeMenu reached for the wrong thing.
    _closeMenu: lift(TAB, "_closeMenu()", ["_"], [lodash]),
    triggerHandlers: (a) => log.push(`raise:${a.service}`),
    _renameOrganization: () => log.push("rename"),
    _commitOrganizationName: () => log.push("commit"),
    _feedPanel: () => log.push("feed"),
    ...over,
  };
  return { self, log };
}

test("Open closes the panel, then raises the screen", () => {
  const onUiEvent = lift(TAB, "onUiEvent(cmd, args = {})", ["_", "_a"], [lodash, A]);
  const { self, log } = tabStub();
  onUiEvent.call(self, { get: () => "open-org-view" });
  // ORDER MATTERS: closed on the way out, not after the screen has mounted, so
  // the panel does not blink away on top of it.
  assert.deepEqual(log, ["close", "raise:open-org-view"]);
});

test("the rename still leaves the panel open", () => {
  // This is what `persistence: always` is FOR. A close here would take the
  // entry the user is typing in with it.
  const onUiEvent = lift(TAB, "onUiEvent(cmd, args = {})", ["_", "_a"], [lodash, A]);
  for (const service of ["rename-organization", "commit-organization-name"]) {
    const { self, log } = tabStub();
    onUiEvent.call(self, { get: () => service, getValue: () => "x" });
    assert.ok(!log.includes("close"), `${service} closed the panel`);
  }
});

test("_closeMenu goes through the toggle, and survives having no menu", () => {
  const closeMenu = lift(TAB, "_closeMenu()", ["_"], [lodash]);
  const calls = [];

  closeMenu.call({
    _menu: { el: {}, isDestroyed: () => false, _triggerToggle: () => calls.push(1) },
  });
  assert.equal(calls.length, 1);

  // Nothing to close: before the menu part is ready, after the widget is torn
  // down, and the case where ui-core hands back a view with no element.
  closeMenu.call({});
  closeMenu.call({ _menu: { el: {}, isDestroyed: () => true } });
  closeMenu.call({ _menu: { isDestroyed: () => false } });
  assert.equal(calls.length, 1, "closed something that was not there");
});

test("the menu part is captured, and the panel part still feeds", () => {
  const onPartReady = lift(TAB, "onPartReady(child, pn)", ["_"], [lodash]);
  const { self, log } = tabStub({ _menu: null });

  const menu = { el: {}, isDestroyed: () => false };
  onPartReady.call(self, menu, "org-menu");
  assert.equal(self._menu, menu, "the menu part was not kept — Open cannot close it");

  onPartReady.call(self, {}, "org-panel");
  assert.ok(log.includes("feed"), "the panel part stopped being fed");
});

test("ui-core cannot latch its close-refusal brake", () => {
  // _closeItems returns early on `this.brake`, and nothing clears it. Only
  // _close() sets it, and _close() is dead code in this ui-core — no caller,
  // in the widget or in the addons that dispatch radio events. If an upgrade
  // wires it up, a `persistence: always` origin could latch the brake and this
  // panel would silently stop closing; that is what this test is watching for.
  const menu = readFileSync(MENU, "utf8");
  assert.match(menu, /if \(this\.brake\)/, "the brake is gone — drop this test");
  const callers = menu.split("\n").filter((l) => /this\._close\(/.test(l));
  assert.deepEqual(callers, [], `_close() is now called: ${callers.join(" | ")}`);
});
