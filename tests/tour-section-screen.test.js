// A full-canvas screen (Calendar, Inbox, Admin Console…) opened during an
// in-window tour shows the screen, never the workspace pane first.
//
// togglePanel used to end the tour before the screen's lazy chunk had painted,
// so the tour's fade uncovered window-folder__split-body. It now ends the tour
// only after the screen is up. Methods are cut out of the SOURCE FILE, as
// tests/rail-logo-home.test.js does.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const DESK = resolve(__dirname, "../src/drumee/modules/desk/index.js");
const src = readFileSync(DESK, "utf8");

function grab(name) {
  const m = new RegExp(`\\n  (async )?${name}\\(`).exec(src);
  assert.ok(m, `${name} not found`);
  const start = m.index + 1;
  return src.slice(start, src.indexOf("\n  }\n", start) + 4);
}

const tick = () => new Promise((r) => setImmediate(r));

function desk({ chunk } = {}) {
  const scope = {
    _: { isFunction: (f) => typeof f === "function" },
    Kind: { get: () => ({}), waitFor: () => chunk || Promise.resolve({}) },
    requestAnimationFrame: (f) => setImmediate(f),
    setTimeout: (f, ms) => setTimeout(f, ms).unref(),
    clearTimeout,
  };
  const keys = Object.keys(scope);
  const d = new Function(...keys, `return { ${["_hasWindowTour", "_endWindowTourAfter"].map(grab).join(",\n")} };`)(
    ...keys.map((k) => scope[k]),
  );
  d.ended = 0;
  d._endWindowTour = () => { d.ended++; };
  return d;
}

test("the tour stays up until the screen's chunk has landed and painted", async () => {
  let land;
  const d = desk({ chunk: new Promise((r) => (land = r)) });
  let feed;
  d._endWindowTourAfter(new Promise((r) => (feed = r)), "calendar_main");
  await tick();
  assert.equal(d.ended, 0, "ended before the screen was even fed");
  feed();
  for (let i = 0; i < 4; i++) await tick();
  assert.equal(d.ended, 0, "ended before the chunk landed");
  land({});
  for (let i = 0; i < 6; i++) await tick();
  assert.equal(d.ended, 1);
});

test("a failed open still ends the tour, once", async () => {
  const d = desk();
  d._endWindowTourAfter(Promise.reject(new Error("x")), "calendar_main");
  for (let i = 0; i < 6; i++) await tick();
  assert.equal(d.ended, 1);
});

test("_hasWindowTour", () => {
  const d = desk();
  assert.equal(d._hasWindowTour(), false);
  d._windowTour = { isDestroyed: () => false };
  assert.equal(d._hasWindowTour(), true);
  d._windowTour = { isDestroyed: () => true };
  assert.equal(d._hasWindowTour(), false);
});

test("togglePanel defers the end for the main slot only, and never ends it up front there", () => {
  const body = grab("togglePanel");
  assert.match(body, /const tourWaitsForScreen = pn === "settings-main-slot" && this\._hasWindowTour\(\);/);
  assert.match(body, /if \(!tourWaitsForScreen && !tourStaysUp\) this\._endWindowTour\(\);/);
  // No other, unconditional end left behind.
  assert.equal((body.match(/this\._endWindowTour\(/g) || []).length, 1);
  assert.match(body, /if \(tourWaitsForScreen\) this\._endWindowTourAfter\(settled, kind\);\n    return settled;/);
});

// Files pressed during a tour parks `_railTab("files")` on the tour's release,
// cancelled only when _navSeq has moved. A full-canvas screen must move it, or
// the parked tab lands over that screen when the tour ends.
test("opening a full-canvas screen counts as a navigation, side panels do not", () => {
  const body = grab("togglePanel");
  const nav = body.indexOf('if (pn === "settings-main-slot") this._navigated();');
  assert.ok(nav > 0, "togglePanel never bumps _navSeq for the main slot");
  assert.ok(nav < body.indexOf("const settled = this.ensurePart(pn)"), "must bump before the screen opens");

  // And the parked tab really is guarded by that counter.
  const railTour = grab("_railTabWithTour");
  assert.match(railTour, /whenDone\(tour, \(\) => \{[\s\S]*\(this\._navSeq \|\| 0\) === seq\) this\._railTab\(tab\)/);
});

// A Wm.confirm during a tour (the "Unlock Admin Console" card) dissolves the
// window manager's isolation, which released the pane at 50001 over the tour's
// overlay at 50000. The skin caps the window layers under the overlay while
// both flags are up.
test("a wrapper-modal during a tour keeps the pane under the tour", () => {
  const skin = readFileSync(resolve(__dirname, "../src/drumee/modules/desk/skin/index.scss"), "utf8");
  const at = skin.indexOf('.desk-module[data-window-tour="1"][data-wm-modal="open"] {');
  assert.ok(at > 0, "cap rule missing");
  const block = skin.slice(at, skin.indexOf("\n}\n", at));
  assert.match(block, /\.window-manager__layer:not\(\.upload-progress-layer\):not\(\.meeting-toast-layer\) \{\s*z-index: (\d+) !important;/);
  const [base, focused] = [...block.matchAll(/z-index: (\d+) !important;/g)].map((m) => +m[1]);
  assert.ok(base < 50000 && focused < 50000 && focused > base, `pane must stay under the tour (50000): ${base}/${focused}`);
});

// Admin Console upsell while the migrate tour is owed: tour first, THEN leave
// the section screen underneath it, THEN the card — and resolve without
// waiting for the card to close (the icon spinner waits on this promise).
function upsellDesk({ offerable = true, tourUp = false, raised = true, mounts = true, ws = {} } = {}) {
  const log = [];
  const modules = { "libs/tutorial-tours": { offerable: () => offerable } };
  const d = new Function("require", `return { ${grab("_showAdminUnlockOverTour")} };`)((m) => modules[m]);
  d._hasWindowTour = () => tourUp;
  d._railWorkspace = () => ws;
  d._raiseRailTour = async (t) => { log.push(`raise:${t}`); return raised; };
  d._awaitWindowTour = async () => { log.push("tour-up"); return mounts; };
  d._leaveSectionScreen = () => log.push("leave-section");
  d._showAdminUnlockModal = () => { log.push("card"); return new Promise(() => {}); };
  return { d, log };
}

test("upsell: raises the owed migrate tour, leaves the screen under it, then the card", async () => {
  const { d, log } = upsellDesk();
  await d._showAdminUnlockOverTour(); // must not hang on the never-settling card
  assert.deepEqual(log, ["raise:migrate", "tour-up", "leave-section", "card"]);
});

test("upsell: the card alone when there is no tour to show", async () => {
  for (const [name, opts] of [
    ["tour done", { offerable: false }],
    ["tour already up", { tourUp: true }],
    ["no workspace", { ws: null }],
  ]) {
    const { d, log } = upsellDesk(opts);
    await d._showAdminUnlockOverTour();
    assert.deepEqual(log, ["card"], name);
  }
  // Refused or never mounted: the section screen is NOT left (that would
  // uncover the pane with no tour over it), the card still opens.
  let { d, log } = upsellDesk({ raised: false });
  await d._showAdminUnlockOverTour();
  assert.deepEqual(log, ["raise:migrate", "card"]);
  ({ d, log } = upsellDesk({ mounts: false }));
  await d._showAdminUnlockOverTour();
  assert.deepEqual(log, ["raise:migrate", "tour-up", "card"]);
});

test("toggle-apps routes the upsell through _showAdminUnlockOverTour", () => {
  const start = src.indexOf('      case "toggle-apps": {');
  const body = src.slice(start, src.indexOf("      }", start));
  assert.match(body, /if \(needsAdminConsoleUpgrade\(\)\) \{\s*return this\._showAdminUnlockOverTour\(\);/);
});

// Contacts and Trash keep an in-window tour up (like the bell), and slide in
// over it on the lifted right panel container.
test("contacts and trash keep the tour; the right container is lifted over it", () => {
  const body = grab("togglePanel");
  assert.match(body, /\(kind === "address_book" && pn === "chat-panel"\)/);
  assert.match(body, /\(kind === "panel_trash" && pn === "trash-panel"\)/);
  assert.ok(
    body.indexOf("const tourStaysUp") < body.indexOf("this._endWindowTour()"),
    "decided after the tour was already ended",
  );
  const skin = readFileSync(resolve(__dirname, "../src/drumee/modules/desk/skin/index.scss"), "utf8");
  const tour = skin.slice(skin.indexOf('.desk-module[data-window-tour="1"] {'));
  const block = tour.slice(tour.indexOf(".desk-module__panel-container.right {"));
  const z = +/z-index:\s*(\d+)/.exec(block)[1];
  assert.ok(z > 50000, "contacts would open under the tour");
});

// Files raises the migrate tour, a lazy chunk; the Calendar pressed before it
// lands used to get the tour dropped on top of it. The mount records _navSeq,
// and a tour that arrives after a navigation is ended at once, unseen.
test("a tour that lands after the user navigated away is dropped", async () => {
  const mount = grab("mountWindowTutorial");
  const stamp = mount.indexOf("this._windowTourSeq = this._navSeq || 0;");
  assert.ok(stamp > 0, "mount does not record the navigation");
  assert.ok(stamp < mount.indexOf('this.ensurePart("overlay")'), "recorded after the async feed");

  const part = src.slice(src.indexOf('      case "window-tutorial": {'));
  const body = part.slice(0, part.indexOf("\n      case "));
  const check = body.indexOf("if ((this._navSeq || 0) !== (this._windowTourSeq || 0)) {");
  assert.ok(check > 0, "ready handler never compares");
  assert.ok(check > body.indexOf("child.once(_e.destroy"), "must drop AFTER the release handler is bound");
  assert.match(body.slice(check), /this\._endWindowTour\(\{ immediate: true \}\)/);

  // Run the ready handler's decision against a fake desk.
  const decide = new Function("child", "_navSeq", "_windowTourSeq", `
    const self = { _navSeq, _windowTourSeq, _windowTour: child, ended: [] };
    self._endWindowTour = (o) => self.ended.push(o);
    (function () { ${body.slice(check, body.indexOf("\n        return;", check))} }).call(self);
    return self;
  `);
  const same = decide({}, 3, 3);
  const moved = decide({}, 4, 3);
  await Promise.resolve(); await Promise.resolve();
  assert.deepEqual(same.ended, []);
  assert.deepEqual(moved.ended, [{ immediate: true }]);
});

// Files pressed while the migrate tour is ALREADY up used to ask for migrate
// again; that request waited for the running tour to release, the Calendar's
// togglePanel released it, and a fresh migrate tour mounted over the Calendar.
function railDesk({ offerable = true, running = null, raise } = {}) {
  const log = [];
  const whenDone = [];
  const modules = {
    "libs/tutorial-tours": {
      offerable: () => offerable,
      whenDone: (t, cb) => whenDone.push(cb),
    },
  };
  const d = new Function(
    "require", "_",
    `return { ${["_railTabWithTour", "_windowTourIs", "_hasWindowTour", "_raiseRailTour"].map(grab).join(",\n")} };`,
  )((m) => modules[m], { isFunction: (f) => typeof f === "function" });
  d._navSeq = 0;
  d._navigated = () => ++d._navSeq;
  d._railWorkspace = () => ({});
  d._leaveSectionScreen = () => {};
  d._endWindowTourUnlessAbout = () => {};
  d._railTab = (tab) => log.push(`tab:${tab}`);
  d._windowTour = running ? { isDestroyed: () => false, mget: (k) => (k === "tour" ? running : null) } : null;
  if (raise) d._raiseRailTour = raise;
  return { d, log, whenDone };
}

test("Files during its own tour shows the tab at once and asks for nothing", async () => {
  let asked = 0;
  const { d, log, whenDone } = railDesk({ running: "migrate", raise: async () => { asked++; return true; } });
  await d._railTabWithTour("files", "migrate");
  assert.equal(asked, 0, "asked for the tour that is already up");
  assert.deepEqual(log, ["tab:files"]);
  assert.equal(whenDone.length, 0);
});

test("a navigation while the tour was being asked for drops both the tour and the tab", async () => {
  let release;
  const { d, log, whenDone } = railDesk({
    running: "chat",
    raise: (tour, seq) => new Promise((r) => (release = () => r(true))),
  });
  const pressing = d._railTabWithTour("files", "migrate");
  await Promise.resolve();
  d._navigated(); // the Calendar
  release();
  await pressing;
  assert.deepEqual(log, [], "the Files tab landed over the Calendar");
  assert.equal(whenDone.length, 0, "a tab switch was parked anyway");
});

test("_raiseRailTour refuses to claim after a navigation during its wait", async () => {
  const { d } = railDesk();
  let fired = 0;
  d._whenToursIdle = async () => { d._navigated(); };
  const Tours = { fire: () => { fired++; return true; } };
  d._raiseRailTour = new Function("require", `return { ${grab("_raiseRailTour")} };`)(() => Tours)._raiseRailTour.bind(d);
  assert.equal(await d._raiseRailTour("migrate", 0), false);
  assert.equal(fired, 0);
  // Without a seq (boot tour, upsell) it claims as before.
  d._navSeq = 5;
  d._whenToursIdle = async () => {};
  assert.equal(await d._raiseRailTour("migrate"), true);
  assert.equal(fired, 1);
});
