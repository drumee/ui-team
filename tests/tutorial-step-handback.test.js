/**
 * How the workspace step hands things back to the host — and why it must not
 * use triggerHandlers to do it.
 *
 * `triggerHandlers` is ui-core's CLICK dispatcher, not a message bus, and it
 * carries the click's own gating. The one that matters here:
 *
 *   letc/addons/letc.js
 *     const handlers = this.getHandlers(_a.ui);
 *     if (pointerDragged || _.isEmpty(handlers)) return;   // silently
 *
 * `window.pointerDragged` is raised by the RESIZE handler
 * (letc/addons/dom/events-handler.js — `window.pointerDragged = true`, set
 * before its own `srcElement != window` guard, so ANY element's resize does
 * it) and is cleared by nothing but a pointerup or a keyup.
 *
 * That is harmless for a raise made straight out of a click: the pointerup
 * that delivered the click has just cleared the flag. It is NOT harmless for a
 * raise made after an `await`. Both of this step's network calls are followed
 * by one:
 *
 *   _create()  awaits libs/create-workspace, then tells the host what it made
 *   _invite()  awaits hub.invite, then hands the tour back through _advance()
 *
 * A resize anywhere in that round trip sets the flag, nothing clears it before
 * the raise lands, and the raise is dropped without a word. The workspace is
 * created on the server and the host never hears about it, so _createdWorkspace
 * stays null, Wm.loadWorkspace is never called, and the tour ends on a desk
 * that never opens the thing it just made.
 */

const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const STEP_PATH = join(REPO_ROOT, "src/drumee/modules/desk/tutorial/workspace/index.js");
const LETC = join(REPO_ROOT, "node_modules/@drumee/ui-core/letc/addons/letc.js");
const EVENTS = join(REPO_ROOT, "node_modules/@drumee/ui-core/letc/addons/dom/events-handler.js");

test("ui-core's triggerHandlers really does drop the event when pointerDragged", () => {
  // The premise, run against the real function rather than described. If a
  // ui-core upgrade removes the gate, this says so and the helper below can go.
  const src = readFileSync(LETC, "utf8");
  const i = src.indexOf("View.prototype.triggerHandlers = function (e) {");
  assert.notEqual(i, -1, "triggerHandlers moved — this whole file needs rechecking");
  const body = src.slice(src.indexOf("{", i) + 1, src.indexOf("\n};", i));

  const run = (pointerDragged) => {
    const got = [];
    const host = { triggerMethod: (sig, s, e) => got.push(e.service) };
    const self = {
      mget: () => undefined,
      getHandlers: () => [host],
      triggerMethod: () => {},
      trigger: () => {},
    };
    // eslint-disable-next-line no-new-func
    new Function(
      "pointerDragged", "_a", "_e", "_", "RADIO_CLICK",
      `return function (e) {${body}};`,
    )(
      pointerDragged,
      { active: "active", ui: "ui", on_click: "on_click", signal: "signal" },
      { click: "click", ui: { event: "ui:event" }, also: { click: "also:click" }, bubble: "bubble" },
      {
        isEmpty: (a) => !a || !a.length,
        isFunction: (f) => typeof f === "function",
        isString: (s) => typeof s === "string",
        isArray: Array.isArray,
      },
      { trigger: () => {} },
    ).call(self, { service: "workspace-created" });
    return got;
  };

  assert.deepEqual(run(false), ["workspace-created"], "delivered with the flag clear");
  assert.deepEqual(run(true), [], "SILENTLY DROPPED with the flag set — the whole bug");
});

test("the resize handler sets the flag, and only a pointer/key up clears it", () => {
  // Why the flag can be set at a moment that has nothing to do with dragging.
  const src = readFileSync(EVENTS, "utf8");
  assert.match(
    src, /__resize = function \(e\) \{\s*\n\s*window\.pointerDragged = true;/,
    "resize raises it — and before its own srcElement guard, so any element counts",
  );
  const clears = src.match(/window\.pointerDragged = false/g) || [];
  assert.equal(clears.length, 2, "a pointerup and a keyup, and nothing else");
});

test("every hand-back to the host goes through _raise, not triggerHandlers", () => {
  // The fix. One helper, used for all of them — the two that follow an await
  // are the ones that break, but splitting the rule by call site is how the
  // next await-then-raise gets written back into the bug.
  const src = readFileSync(STEP_PATH, "utf8");
  assert.doesNotMatch(
    src, /this\.triggerHandlers\(/,
    "triggerHandlers is the click dispatcher; a hand-back is not a click",
  );
  for (const service of ["workspace-created", "next-step", "back-step"]) {
    assert.match(
      src, new RegExp(`_raise\\(\\{\\s*service:\\s*'${service}'`),
      `${service} must be raised through the helper`,
    );
  }
});

test("_raise reaches the host with the flag set", () => {
  // The proof that the helper actually solves it: same condition that drops a
  // triggerHandlers raise, and the payload still lands.
  const src = readFileSync(STEP_PATH, "utf8");
  const head = "  _raise(payload) {";
  const i = src.indexOf(head);
  assert.notEqual(i, -1, "_raise is missing");
  const body = src.slice(i + head.length, src.indexOf("\n  }\n", i));

  const got = [];
  const host = { triggerMethod: (sig, s, e) => got.push({ sig, service: e.service, ws: e.workspace }) };
  const self = { getHandlers: () => [host, self] };   // itself included, as ui-core does
  // eslint-disable-next-line no-new-func
  new Function("_a", "_e", "_", `return function (payload) {${body}};`)(
    { ui: "ui" },
    { ui: { event: "ui:event" } },
    { isFunction: (f) => typeof f === "function" },
  ).call(self, { service: "workspace-created", workspace: { hub_id: "h_1" } });

  assert.equal(got.length, 1, "delivered exactly once — and never to itself");
  assert.equal(got[0].sig, "ui:event", "the signal ui-core's own dispatch uses");
  assert.equal(got[0].service, "workspace-created");
  assert.deepEqual(got[0].ws, { hub_id: "h_1" }, "the payload survives intact");
});

test("the two raises that follow an await are the ones this protects", () => {
  // Named so the reason survives. A future raise placed after a network call
  // inherits the same hazard, and the helper is what makes that safe.
  const src = readFileSync(STEP_PATH, "utf8");
  const create = src.slice(src.indexOf("async _create()"), src.indexOf("async _invite()"));
  assert.ok(/await/.test(create) && /_raise\(/.test(create),
    "_create awaits the create, then raises");
  assert.ok(
    src.indexOf("_raise({ service: 'workspace-created'") > src.indexOf("await require('libs/create-workspace')"),
    "and the raise is genuinely after the await — that is the whole hazard",
  );
});
