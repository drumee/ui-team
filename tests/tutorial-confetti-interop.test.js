/**
 * The tour's confetti, and the resolution trap that silently disarmed it.
 *
 * `require('canvas-confetti')` does not mean the same thing here as it does in
 * Node. The package ships two builds and declares both:
 *
 *   "main":   "src/confetti.js"            CommonJS — module.exports = fn
 *   "module": "dist/confetti.module.mjs"   ESM      — export default fn
 *
 * Node's require() reads `main` and hands back a callable function. Webpack
 * targets the web, where resolve.mainFields defaults to
 * ['browser', 'module', 'main'] — so it reads `module`, bundles the ESM build,
 * and `__webpack_require__` returns a MODULE NAMESPACE OBJECT: { create,
 * default }. Not callable.
 *
 * So `confetti({...})` threw `confetti is not a function` in the browser and
 * only in the browser, inside a try/catch that reported it with this.warn and
 * moved on. The tour ended, the workspace opened, and nothing said why there
 * was no confetti. Verified against the deployed bundle: module 14685 is
 * ./node_modules/canvas-confetti/dist/confetti.module.mjs, wrapped with
 * __webpack_require__.r + .d({ create, "default" }).
 *
 * These tests resolve the way WEBPACK does, not the way Node does — which is
 * the whole point, because a Node-resolution test passes while the browser is
 * broken.
 */

const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join, dirname } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const HOST_PATH = join(REPO_ROOT, "src/drumee/modules/desk/tutorial/index.js");
const PKG_DIR = join(REPO_ROOT, "node_modules/canvas-confetti");

/** Webpack 5's default mainFields for `target: 'web'`. */
const WEBPACK_MAIN_FIELDS = ["browser", "module", "main"];

/** The file webpack will actually bundle for a bare specifier. */
function webpackEntry(pkgDir) {
  const pkg = JSON.parse(readFileSync(join(pkgDir, "package.json"), "utf8"));
  for (const field of WEBPACK_MAIN_FIELDS) {
    if (typeof pkg[field] === "string") return { field, file: pkg[field] };
  }
  return { field: "main", file: "index.js" };
}

test("webpack resolves canvas-confetti to the ESM build, not the CJS one", () => {
  // The premise. If the package ever drops "module", the interop guard below
  // stops being load-bearing and this test says so rather than silently
  // passing forever.
  const { field, file } = webpackEntry(PKG_DIR);
  assert.equal(field, "module", "webpack picks `module` before `main`");
  assert.match(file, /\.mjs$/, "and that is the ESM build");

  const pkg = JSON.parse(readFileSync(join(PKG_DIR, "package.json"), "utf8"));
  assert.match(pkg.main, /src\/confetti\.js$/, "while Node's require() reads a CJS file");
  assert.notEqual(pkg.main, pkg.module, "the two entries are different files — that IS the trap");
});

test("the ESM namespace is NOT callable, so a bare require cannot be fired", async () => {
  // The bug, reproduced. This is what the browser holds; a Node require() of
  // the same specifier holds a function, which is why this was invisible.
  const { file } = webpackEntry(PKG_DIR);
  const ns = await import(join(PKG_DIR, file));
  assert.notEqual(
    typeof ns, "function",
    "a module namespace object is never callable — calling it throws",
  );
  assert.equal(typeof ns.default, "function", "the cannon is on .default");
  assert.equal(typeof ns.create, "function", "and .create beside it");

  const cjs = require(join(PKG_DIR, JSON.parse(
    readFileSync(join(PKG_DIR, "package.json"), "utf8"),
  ).main));
  assert.equal(typeof cjs, "function", "Node's build IS callable — hence the false negative");
});

test("_celebrate unwraps the default export before firing", () => {
  // The fix, and the only thing standing between the tour and a silent no-op.
  // `mod.default || mod` is the codebase's existing shape for this (see
  // builtins/widget/settings/main/index.js for heic2any) and survives both
  // resolutions, so a change of bundler or mainFields cannot break it.
  const src = readFileSync(HOST_PATH, "utf8");
  const body = src.slice(src.indexOf("_celebrate() {"), src.indexOf("_openCreated() {"));
  assert.ok(body.includes("canvas-confetti"), "sanity: this is the right method");
  assert.match(
    body, /\.default \|\| /,
    "the require result must be unwrapped, or the browser gets a namespace object",
  );
  assert.doesNotMatch(
    body, /const confetti = require\('canvas-confetti'\);/,
    "a bare require is the bug — it is callable in Node and not in the browser",
  );
  // And it must be CALLED through the unwrapped binding.
  assert.match(body, /confetti\(\{/, "the cannon is fired");
});

test("the failure is reported, not swallowed into silence", () => {
  // It already was — this.warn ran and said '[tutorial] confetti failed'. The
  // point is that it must stay a warn and never become a bare catch {}, or the
  // next resolution change is invisible all over again.
  const src = readFileSync(HOST_PATH, "utf8");
  const body = src.slice(src.indexOf("_celebrate() {"), src.indexOf("_openCreated() {"));
  assert.match(body, /catch \(e\) \{[\s\S]{0,200}this\.warn/, "a swallowed catch hides the next one");
});


// ── waiting for the workspace to actually be there ──────────────────────────
//
// The confetti used to go up the moment Wm.loadWorkspace was CALLED, which is a
// different event from the workspace opening. loadWorkspace returns undefined
// and mounts its pane from inside a media.attributes fetch, so the celebration
// raced the network: on a slow link it played over an empty desk, and on a
// failed open ("cannot resolve workspace root") it played over a workspace that
// never arrived.
//
// There is no event to hook. `workspace:focus` is the closest thing and is
// suppressed on exactly this path — apply() sets _curWorkspace BEFORE feeding
// the pane, so onWorkspaceRaised sees sameContext and stays quiet. So the host
// watches for the pane through Wm._findWorkspaceWindow, which is the same
// accessor loadWorkspace itself uses to ask "is this hub already open".

/** Bind one real method off the host source, with its globals injected. */
function bindHost(sig, host, globals) {
  const src = readFileSync(HOST_PATH, "utf8");
  const start = src.indexOf(`  ${sig} {`);
  assert.notEqual(start, -1, `${sig} not found — the test is out of date`);
  const body = src.slice(src.indexOf("{", start) + 1, src.indexOf("\n  }\n", start));
  const names = Object.keys(globals);
  const args = sig.slice(sig.indexOf("(") + 1, sig.lastIndexOf(")"));
  // eslint-disable-next-line no-new-func
  return new Function(...names, `return function (${args}) {${body}};`)(
    ...names.map((n) => globals[n]),
  ).bind(host);
}

const BUDGET = (() => {
  const src = readFileSync(HOST_PATH, "utf8");
  return {
    wait: Number(/const OPEN_WAIT_MS = (\d+);/.exec(src)[1]),
    poll: Number(/const OPEN_POLL_MS = (\d+);/.exec(src)[1]),
  };
})();

test("the wait resolves as soon as the pane is there", async () => {
  const host = {};
  let looks = 0;
  const Wm = {
    _findWorkspaceWindow: (hub_id) => (++looks >= 3 ? { hub_id } : null),
  };
  const wait = bindHost("_workspaceOnScreen(hub_id)", host, {
    Wm, _: { isFunction: (f) => typeof f === "function" },
    OPEN_WAIT_MS: BUDGET.wait, OPEN_POLL_MS: 1,
  });
  const pane = await wait("h_1");
  assert.deepEqual(pane, { hub_id: "h_1" }, "it resolves with the pane it found");
  assert.equal(looks, 3, "and it kept looking until the pane appeared");
});

test("a pane that is already open resolves immediately, on the first look", async () => {
  // Re-running the tour against a workspace that exists still ends in a
  // celebration — loadWorkspace early-returns there, so nothing new mounts and
  // a wait that insisted on a CHANGE would hang until the budget ran out.
  const host = {};
  let looks = 0;
  const wait = bindHost("_workspaceOnScreen(hub_id)", host, {
    Wm: { _findWorkspaceWindow: (hub_id) => (looks++, { hub_id }) },
    _: { isFunction: (f) => typeof f === "function" },
    OPEN_WAIT_MS: BUDGET.wait, OPEN_POLL_MS: 1,
  });
  assert.ok(await wait("h_1"));
  assert.equal(looks, 1, "no polling at all when it is already up");
});

test("a workspace that never opens resolves null, and is reported", async () => {
  // The whole point of waiting. No pane means the open failed, and a failed
  // open is not something to throw confetti at.
  const host = { warn: (...a) => host.__warned = a.join(" ") };
  const wait = bindHost("_workspaceOnScreen(hub_id)", host, {
    Wm: { _findWorkspaceWindow: () => null },
    _: { isFunction: (f) => typeof f === "function" },
    OPEN_WAIT_MS: 20, OPEN_POLL_MS: 1,     // the real budget is 8s; this is the shape
  });
  assert.equal(await wait("h_1"), null);
  assert.match(host.__warned || "", /never opened/, "silence would hide a broken open");
});

test("the budget is long enough for a slow link and short enough to give up", () => {
  assert.ok(BUDGET.wait >= 5000, "a cold media.attributes on a bad link needs seconds");
  assert.ok(BUDGET.wait <= 15000, "past this the open has failed, not slowed");
  assert.ok(BUDGET.poll <= 250, "the confetti must feel like it belongs to the reveal");
});

test("_openCreated hands back a promise on every path, including its refusals", () => {
  // The caller does .then() on it unconditionally. An early `return null` for a
  // missing workspace or a throwing Wm would be a TypeError at the exit of
  // every tour that never created anything — which is most of them.
  const src = readFileSync(HOST_PATH, "utf8");
  const body = src.slice(src.indexOf("_openCreated() {"), src.indexOf("_workspaceOnScreen(hub_id) {"));
  const bareNulls = body.match(/return null;/g) || [];
  assert.equal(bareNulls.length, 0, "every exit must be a promise, not a bare null");
  assert.equal((body.match(/return Promise\.resolve\(null\)/g) || []).length, 2,
    "the no-workspace guard and the throwing-Wm catch");
});
