/**
 * How the host learns which workspace the tour built — and why it does not
 * simply trust the step to have told it.
 *
 * The step raises `workspace-created` as soon as the create resolves, and when
 * that lands the host has the value before it is needed. But that raise goes
 * through ui-core's `triggerHandlers`, which is the CLICK dispatcher, not a
 * message bus, and carries the click's own gating:
 *
 *   letc/addons/letc.js
 *     const handlers = this.getHandlers(_a.ui);
 *     if (pointerDragged || _.isEmpty(handlers)) return;   // silently
 *
 * `window.pointerDragged` is raised by the RESIZE handler
 * (letc/addons/dom/events-handler.js sets it before its own
 * `srcElement != window` guard, so any element's resize counts) and is cleared
 * by nothing but a pointerup or a keyup.
 *
 * A raise made straight out of a click is safe — the pointerup that delivered
 * the click has just cleared the flag. The create's raise is NOT: it happens
 * after an await on the network, and a resize anywhere in that round trip sets
 * the flag with nothing left to clear it before the raise lands. Dropped in
 * silence, the host never learns, Wm.loadWorkspace is never called, and the
 * tour ends having built a workspace it never opens — and with nothing to
 * throw confetti at.
 *
 * So the host READS the value at the moment it needs it. The push stays as the
 * fast path; the read is what makes it not matter whether the push arrived.
 */

const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const HOST_PATH = join(REPO_ROOT, "src/drumee/modules/desk/tutorial/index.js");
const LETC = join(REPO_ROOT, "node_modules/@drumee/ui-core/letc/addons/letc.js");
const EVENTS = join(REPO_ROOT, "node_modules/@drumee/ui-core/letc/addons/dom/events-handler.js");

/** Bind one real method off the host source, with its globals injected. */
function bindHost(sig, host, globals) {
  const src = readFileSync(HOST_PATH, "utf8");
  const head = `  ${sig} {`;
  const i = src.indexOf(head);
  assert.notEqual(i, -1, `${sig} not found — this test is out of date`);
  const body = src.slice(i + head.length, src.indexOf("\n  }\n", i));
  const names = Object.keys(globals);
  const args = sig.slice(sig.indexOf("(") + 1, sig.lastIndexOf(")"));
  // eslint-disable-next-line no-new-func
  return new Function(...names, `return function (${args}) {${body}};`)(
    ...names.map((n) => globals[n]),
  ).bind(host);
}

const GLOBALS = () => ({
  _a: { content: "content" },
  _: { isFunction: (f) => typeof f === "function" },
});

/** A host whose content part holds one step widget. */
function hostWith(step) {
  const host = {};
  const part = { children: { last: () => step } };
  host.getPart = (pn) => (pn === "content" ? part : null);
  host._createdFromStep = bindHost("_createdFromStep()", host, GLOBALS());
  return host;
}

test("ui-core really does drop a raise when pointerDragged is set", () => {
  // The premise, run against the real function. If a ui-core upgrade removes
  // the gate, this says so and the read below stops being load-bearing.
  const src = readFileSync(LETC, "utf8");
  const i = src.indexOf("View.prototype.triggerHandlers = function (e) {");
  assert.notEqual(i, -1, "triggerHandlers moved — recheck this whole file");
  const body = src.slice(src.indexOf("{", i) + 1, src.indexOf("\n};", i));

  const run = (pointerDragged) => {
    const got = [];
    const handler = { triggerMethod: (sig, s, e) => got.push(e.service) };
    const self = {
      mget: () => undefined,
      getHandlers: () => [handler],
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
  assert.deepEqual(run(true), [], "SILENTLY DROPPED with it set — why the host reads");
});

test("the resize handler sets that flag, and only a pointer/key up clears it", () => {
  const src = readFileSync(EVENTS, "utf8");
  assert.match(
    src, /__resize = function \(e\) \{\s*\n\s*window\.pointerDragged = true;/,
    "resize raises it, before its own srcElement guard — so any element counts",
  );
  assert.equal(
    (src.match(/window\.pointerDragged = false/g) || []).length, 2,
    "a pointerup and a keyup, and nothing else",
  );
});

test("the host reads the workspace off the live step", () => {
  const host = hostWith({ _created: { type: "team", hub_id: "h_1", filename: "Design" } });
  assert.deepEqual(host._createdFromStep(), { type: "team", hub_id: "h_1", filename: "Design" });
});

test("a step that built nothing yields nothing", () => {
  // Every other tour ends through here too, and none of them created anything.
  assert.equal(hostWith({})._createdFromStep(), null, "a step with no _created");
  assert.equal(hostWith({ _created: null })._createdFromStep(), null);
  assert.equal(hostWith(null)._createdFromStep(), null, "no step at all");
  assert.equal(
    hostWith({ _created: { filename: "no id" } })._createdFromStep(), null,
    "a workspace with no hub_id is nothing to open",
  );
});

test("a destroyed step is not read", () => {
  const step = { _created: { hub_id: "h_1" }, isDestroyed: () => true };
  assert.equal(hostWith(step)._createdFromStep(), null);
  step.isDestroyed = () => false;
  assert.deepEqual(hostWith(step)._createdFromStep(), { hub_id: "h_1" });
});

test("_openCreated falls back to the read, and remembers what it found", () => {
  // The push is the fast path; the read is what makes a dropped push harmless.
  const src = readFileSync(HOST_PATH, "utf8");
  assert.match(
    src, /const ws = this\._createdWorkspace \|\| this\._createdFromStep\(\);/,
    "the pushed value first, then the read",
  );
  // _celebrate guards on _createdWorkspace, so a value that arrived only via
  // the read has to be stored or the confetti is skipped on exactly the runs
  // this exists to rescue.
  assert.match(
    src, /this\._createdWorkspace = ws;/,
    "what the read found must be remembered, or _celebrate refuses it",
  );
  const open = src.slice(src.indexOf("_openCreated() {"), src.indexOf("_createdFromStep() {"));
  assert.ok(
    open.indexOf("this._createdWorkspace = ws;") < open.indexOf("Wm.loadWorkspace"),
    "stored before the open, so the celebration cannot race it",
  );
});

test("both endings reach the read, because both go through _openCreated", () => {
  const src = readFileSync(HOST_PATH, "utf8");
  for (const exit of ["_enterCreated", "_skipTour"]) {
    assert.match(
      src, new RegExp(`${exit}\\(\\)\\s*\\{[\\s\\S]{0,400}this\\._openCreatedAndCelebrate\\(\\)`),
      `${exit} opens and celebrates through the shared helper`,
    );
  }
  assert.match(
    src, /_openCreatedAndCelebrate\(\)\s*\{[\s\S]{0,400}\.then\(\(pane\) => \{\s*\n\s*if \(pane\) this\._celebrate\(\)/,
    "and the confetti still waits for the pane to actually be there",
  );
});
