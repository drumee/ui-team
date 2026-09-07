// The toolbar's "+ New" and the hero's are ONE control.
//
// The pane the migrate tour draws carries that button twice — Figma puts it in
// the toolbar (142:34981) and again in the empty-state hero — and only the
// hero's copy ever did anything. That is the wrong half to leave dead: the
// toolbar is where the product keeps New, so it is the one a user reaches for
// out of habit, and pressing it and getting nothing reads as a tour that has
// frozen.
//
// So both raise the same service, hang the same dropdown, and create through
// the same rows — and creating through them is what completes this tour.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { execFileSync } = require("node:child_process");
const { renderModule, find, findAll } = require("./helpers/render-skeleton.js");

const ROOT = join(__dirname, "..");
const SKEL = "src/drumee/modules/desk/tutorial/migrate/skeleton/index.js";
const STEP = join(ROOT, "src/drumee/modules/desk/tutorial/migrate/index.js");
const HOST = join(ROOT, "src/drumee/builtins/window/tutorial/index.js");

const ui = { fig: { family: "tutorial-migrate", group: "tutorial" }, mget: () => null };

// Screen 1 of the tour, as tours.js has it: the pane, live, with the dropdown
// available. Read from the module rather than restated, so a screen that stops
// being live fails here instead of passing against a copy.
const SCREENS = (() => {
  const src = readFileSync(STEP, "utf8");
  const at = src.indexOf("const SCREENS = [");
  assert.ok(at > 0, "SCREENS is gone");
  return src.slice(at, src.indexOf("\n];", at));
})();

const pane = (state) =>
  renderModule(SKEL, ui, { key: "pane", pane: true, live: true, bare: true, menu: true, live_menu: true }, state);
const dialog = () => renderModule(SKEL, ui, { key: "copy", dialog: true }, {});

const newBtn = (t) => find(t, "tutorial__fp-new-btn");
const heroNew = (t) => findAll(t, "tutorial__fp-ghost")[0];
const menuIn = (n) => find(n, "tutorial__fp-new-menu");

test("screen 1 is the live one, and it draws the dropdown", () => {
  // The whole feature hangs off these three flags being on that screen.
  assert.match(SCREENS, /key: 'pane'[\s\S]*?live: true/);
  assert.match(SCREENS, /key: 'pane'[\s\S]*?menu: true/);
  assert.match(SCREENS, /key: 'pane'[\s\S]*?live_menu: true/);
});

test("both + New buttons are real controls, and the same one", () => {
  const t = pane({ menuOpen: null });
  for (const [name, n] of [["toolbar", newBtn(t)], ["hero", heroNew(t)]]) {
    assert.ok(n, `${name} + New is missing`);
    assert.equal(n.service, "mg-toggle-menu", `${name} raises the wrong service`);
    assert.equal(n.attrOpt["data-live"], 1, `${name} is not stamped live`);
    assert.ok(!("active" in n), `${name} is inert and cannot be clicked`);
  }
  // Told apart by where their menu belongs, and by nothing else.
  assert.equal(newBtn(t).attrOpt["data-menu"], "toolbar");
  assert.equal(heroNew(t).attrOpt["data-menu"], "hero");
});

test("closed is closed — neither button draws a menu", () => {
  const t = pane({ menuOpen: null });
  assert.equal(findAll(t, "tutorial__fp-new-menu").length, 0);
  assert.equal(newBtn(t).attrOpt["data-open"], 0);
  assert.equal(heroNew(t).attrOpt["data-open"], 0);
});

test("the dropdown hangs off the button that was pressed", () => {
  // It is a CHILD of the button (the skin positions it against that box), so
  // drawing it without knowing which one was pressed puts it under the other.
  const tb = pane({ menuOpen: "toolbar" });
  assert.ok(menuIn(newBtn(tb)), "no menu under the toolbar button");
  assert.ok(!menuIn(heroNew(tb)), "the hero drew one too");
  assert.equal(newBtn(tb).attrOpt["data-open"], 1);
  assert.equal(heroNew(tb).attrOpt["data-open"], 0);

  const hr = pane({ menuOpen: "hero" });
  assert.ok(menuIn(heroNew(hr)), "no menu under the hero button");
  assert.ok(!menuIn(newBtn(hr)), "the toolbar drew one too");
  assert.equal(heroNew(hr).attrOpt["data-open"], 1);
  assert.equal(newBtn(hr).attrOpt["data-open"], 0);

  // Exactly one on screen either way.
  for (const t of [tb, hr]) assert.equal(findAll(t, "tutorial__fp-new-menu").length, 1);
});

test("the toolbar's menu creates exactly what the hero's creates", () => {
  // Not "has rows" — the same payloads. The rows are what reach the product's
  // own handler, and a second menu that half-matches is a menu that makes a
  // document with no template name.
  const rows = (t) =>
    findAll(t, "tutorial__fp-new-item").map((r) => ({
      service: r.service,
      name: r.name,
      real: r.attrOpt["data-service"],
      live: r.attrOpt["data-live"],
    }));
  const fromToolbar = rows(pane({ menuOpen: "toolbar" }));
  assert.deepEqual(fromToolbar, rows(pane({ menuOpen: "hero" })));
  assert.equal(fromToolbar.length, 4);
  for (const r of fromToolbar) {
    assert.equal(r.service, "mg-do-create", "the tour must see the click first");
    assert.equal(r.live, 1);
  }
  assert.deepEqual(
    fromToolbar.map((r) => r.real),
    ["add-folder", "new-document", "new-document", "new-document"],
  );
  assert.deepEqual(
    fromToolbar.map((r) => r.name),
    [undefined, "document.docx", "spreadsheet.xlsx", "presentation.pptx"],
  );
});

test("on the dialog screens it is a drawing again", () => {
  // The pane is behind a scrim there with nothing bound, and a stray click on
  // it must not move the tour.
  const t = dialog();
  const n = newBtn(t);
  assert.equal(n.active, 0, "the toolbar button is still live behind the dialog");
  assert.ok(!n.service);
  assert.equal(findAll(t, "tutorial__fp-new-menu").length, 0);
});

// ── the handler ─────────────────────────────────────────────────────────────

/** Lift one method out of a class file so it can be run rather than matched. */
function method(file, name, params = []) {
  const src = readFileSync(file, "utf8");
  const plain = src.indexOf(`\n  ${name}(`);
  const asyn = src.indexOf(`\n  async ${name}(`);
  const from = plain > 0 ? plain : asyn;
  assert.ok(from > 0, `${name} is missing`);
  // START AT THE BODY, not at the first `{` after the name — a signature like
  // `onUiEvent(trigger, args = {})` has braces of its own, and matching from
  // there closes on the default value and hands back half a signature.
  let paren = 0;
  let open = -1;
  for (let j = src.indexOf("(", from); j < src.length; j++) {
    if (src[j] === "(") paren++;
    else if (src[j] === ")" && --paren === 0) {
      open = src.indexOf("{", j);
      break;
    }
  }
  assert.ok(open > 0, `${name} has no body`);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) {
      // WRAPPED IN A CLASS, not turned into a function: these methods call
      // `super.onUiEvent`, which is a syntax error outside a method. Extending
      // Object gives `super` something real to look at and no inherited
      // handler, which is exactly the base case.
      const body = src.slice(from + 3, j + 1);
      const make = new Function(...params, `return class extends Object { ${body} }`);
      return (...args) => make(...args).prototype[name];
    }
  }
  throw new Error(`unbalanced ${name}`);
}

const onUiEvent = method(STEP, "onUiEvent", ["_a", "SCREENS"])(
  { service: "service" },
  [{ key: "pane" }],
);

function step() {
  const s = { shown: 0, sent: [], _screenIndex: 0 };
  s._showScreen = () => s.shown++;
  s.triggerHandlers = (a) => s.sent.push(a);
  s.onUiEvent = onUiEvent;
  return s;
}

const press = (menu) => ({ el: { dataset: { menu } }, mget: () => "mg-toggle-menu" });

test("one service, two buttons: the click says which", () => {
  const s = step();
  s.onUiEvent(press("toolbar"));
  assert.equal(s._menuOpen, "toolbar");
  // Pressing the same one closes it.
  s.onUiEvent(press("toolbar"));
  assert.equal(s._menuOpen, null);
  // Pressing the other MOVES it, rather than opening a second copy.
  s.onUiEvent(press("hero"));
  s.onUiEvent(press("toolbar"));
  assert.equal(s._menuOpen, "toolbar");
  assert.equal(s.shown, 4, "every toggle has to redraw");
});

test("a row from either menu performs the real create", () => {
  const s = step();
  const row = {
    el: { dataset: { service: "new-document" } },
    mget: () => "mg-do-create",
  };
  s.onUiEvent(row);
  assert.deepEqual(s.sent, [
    // THE ROW ITSELF as the cmd — the product reads the file name off the
    // thing that was clicked.
    { service: "window-tutorial:act", action: "new-document", cmd: row },
  ]);
});

// ── and creating is what finishes the tour ──────────────────────────────────

test("what the window receives completes the tour", () => {
  // The completion is wired to the WINDOW's arrival hook, not to any button, so
  // it covers the toolbar's menu the moment that menu creates for real — and
  // still refuses to count a dialog or a file picker the user cancelled.
  const watch = method(HOST, "_watchForSuccess", ["_"])(require("lodash"));
  const ws = { newContent: (...a) => `made:${a.join()}` };
  const host = { _watchForSuccess: watch, done: 0, _markDone() { this.done++; } };

  host._watchForSuccess(ws);
  assert.equal(host.done, 0, "arming it must not count as doing it");
  assert.equal(ws.newContent("folder"), "made:folder", "the window still does its job");
  assert.equal(host.done, 1);

  // Installed once, however many times the user creates from either menu.
  const before = ws.newContent;
  host._watchForSuccess(ws);
  assert.equal(ws.newContent, before, "the wrapper was installed twice");
});

test("every real action arms the completion watch first", () => {
  const src = readFileSync(HOST, "utf8");
  const body = src.slice(src.indexOf("_actOnWindow(action, cmd) {"), src.indexOf("_openCreateFolder(ws) {"));
  const arm = body.indexOf("this._watchForSuccess(ws)");
  assert.ok(arm > 0, "the watch is never armed");
  // Before the add-folder branch returns, or a folder created from the tour's
  // own dialog would never be counted.
  assert.ok(arm < body.indexOf("'add-folder'"), "armed after the first early return");
});

// ── and it has to be visible where it lands ─────────────────────────────────

test("the dropdown can hang off the toolbar button, and win", () => {
  // Compiled, not grepped, so a later override counts.
  const css = execFileSync(
    "sass",
    ["-I", ".", "-I", "skin", "--no-source-map", "modules/desk/tutorial/skin/index.scss"],
    { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 },
  );
  const rule = (cls) => {
    const m = new RegExp(`\\.tutorial__${cls} \\{([^}]*)\\}`).exec(css);
    assert.ok(m, `no rule for ${cls}`);
    return m[1];
  };
  // The menu is positioned against the button it is a child of, so that button
  // has to be a containing block — otherwise it hangs off the pane instead.
  assert.match(rule("fp-new-btn"), /position: relative/);

  // And it has to beat the hero block it hangs into. EVERY `.box` is
  // position:relative (skin/lib/container.scss), so the hero is positioned too
  // and tree order alone would give it the top — measured in
  // tests/harness/migrate-toolbar-menu.js, which read `tutorial__fp-hero` back
  // from elementFromPoint at the menu's last row before this was added.
  assert.match(rule("fp-new-menu"), /z-index: 1/);
});
