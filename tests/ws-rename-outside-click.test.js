// Ending the workspace-rename edit: the Save button, and clicking outside
// (modules/desk/index.js — _saveWorkspaceRename, _dismissWorkspaceRename).
//
// Unchanged text closes silently, the way Escape does. CHANGED text asks first,
// because a stray click somewhere else in the desk is not a decision to rename
// a workspace — and it is not a decision to throw the typing away either.
//
// Methods are cut out of the SOURCE FILE and run against a fake `this`, the way
// tests/utility-panel-close.test.js and tests/rail-logo-home.test.js do, so this
// tests the shipped text rather than a copy of it.
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

const ANIM_MS = Number(
  /\nconst WS_RENAME_ANIM_MS = (\d+)/.exec(src)?.[1],
);
assert.ok(ANIM_MS > 0, "WS_RENAME_ANIM_MS not found in the source");

const METHODS = [
  "_bindWorkspaceRenameDismiss",
  "_unbindWorkspaceRenameDismiss",
  "_dismissWorkspaceRename",
  "_saveWorkspaceRename",
  "_finishWorkspaceRename",
  "_endWorkspaceRename",
];

/** An element whose closest() answers for a fixed set of ancestor selectors. */
function target(...inside) {
  return { closest: (sel) => (inside.some((s) => sel.includes(s)) ? {} : null) };
}

/**
 * A desk with the rename editor up.
 * @param {Object} opt
 *   typed    what is in the field now (defaults to the current name)
 *   current  the workspace's name when the edit started
 *   posted   what tile._commitRename answers: "resolve" | "reject" | "none"
 *   confirm  what Wm.confirm answers: "save" | "discard"
 */
function desk(opt = {}) {
  const current = opt.current || "Design";
  const typed = opt.typed === undefined ? current : opt.typed;
  const calls = { commit: [], confirm: [], listeners: 0, crumb: 0, warned: [] };

  const doc = {
    addEventListener: (t, f, c) => { calls.listeners++; doc._f = f; doc._t = t; doc._c = c; },
    removeEventListener: (t, f, c) => { if (f === doc._f) calls.listeners--; },
  };

  // The show/close animation defers the VISUAL teardown by WS_RENAME_ANIM_MS.
  // State teardown stays synchronous, so only feed([]) and the crumb wait.
  const timers = new Map();
  let seq = 0;
  const setTimeout_ = (fn, ms) => { timers.set(++seq, { fn, ms }); return seq; };
  const clearTimeout_ = (id) => { timers.delete(id); };
  const flush = () => { const t = [...timers.values()]; timers.clear(); t.forEach((x) => x.fn()); };

  const field = { value: typed };
  const box = {
    el: {
      dataset: {},
      querySelector: (s) => (/textarea|input/.test(s) ? field : null),
    },
    feed: (k) => { box.fed = k; },
    isDestroyed: () => false,
    children: { last: () => cmd },
  };
  const cmd = {
    goodbye: () => { calls.goodbye = 1; },
    mget: () => typed,
  };
  const chip = { el: { dataset: { renaming: "1" } } };

  const tile = {
    _commitRename: (v) => {
      calls.commit.push(v);
      if (opt.posted === "none") return null;
      if (opt.posted === "reject") return Promise.reject(new Error("nope"));
      return Promise.resolve();
    },
  };

  const Wm = {
    confirm: (o) => {
      calls.confirm.push(o);
      return opt.confirm === "discard"
        ? Promise.reject(new Error("dismissed"))
        : Promise.resolve();
    },
    _findWorkspaceWindow: () => ({ mget: () => 42 }),
    updateBreadcrumb: () => { calls.crumb++; },
  };

  const d = new Function(
    "_", "_a", "LOCALE", "Wm", "document", "setTimeout", "clearTimeout", "WS_RENAME_ANIM_MS",
    `return { ${METHODS.map(grab).join(",\n")} };`,
  )(
    { isFunction: (f) => typeof f === "function" },
    { value: "value", nid: "nid" },
    { SAVE_CHANGES: "Save Changes", SAVE: "Save", DISCARD: "Discard" },
    Wm,
    doc,
    setTimeout_,
    clearTimeout_,
    ANIM_MS,
  );

  d.fig = { family: "desk-module" };
  d.warn = (...a) => calls.warned.push(a);
  d.__wsRename = { tile, current, hubId: 7, box, chip };
  d._crumbGroupPart = chip;
  d._wsRenamePart = box;
  return { d, calls, chip, box, flush, pending: () => timers.size };
}

test("binding is idempotent and unbinding removes exactly one listener", () => {
  const { d, calls } = desk();
  d._bindWorkspaceRenameDismiss();
  d._bindWorkspaceRenameDismiss();
  assert.equal(calls.listeners, 1, "a second bind must not stack a listener");
  d._unbindWorkspaceRenameDismiss();
  assert.equal(calls.listeners, 0);
  d._unbindWorkspaceRenameDismiss();
  assert.equal(calls.listeners, 0, "unbinding twice is harmless");
});

test("a click INSIDE the editor is not a dismissal", async () => {
  const { d, calls, chip } = desk({ typed: "Design renamed" });
  d._bindWorkspaceRenameDismiss();
  await d._dismissWorkspaceRename(target(".desk-module-topbar__ws-rename"));
  assert.equal(calls.confirm.length, 0);
  assert.equal(calls.commit.length, 0);
  assert.ok(d.__wsRename, "the edit is still live");
  assert.equal(chip.el.dataset.renaming, "1");
  assert.equal(calls.listeners, 1, "still listening");
});

test("a click on our own confirm dialog is not a dismissal", async () => {
  const { d, calls } = desk({ typed: "Design renamed" });
  d._bindWorkspaceRenameDismiss();
  await d._dismissWorkspaceRename(target(".window-manager__wrapper-modal"));
  assert.equal(calls.confirm.length, 0);
  assert.ok(d.__wsRename);
});

test("unchanged text closes silently — no confirm, no write", async () => {
  const { d, calls, chip, flush } = desk({ typed: "Design", current: "Design" });
  d._bindWorkspaceRenameDismiss();
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.equal(calls.confirm.length, 0, "nothing to ask about");
  assert.equal(calls.commit.length, 0, "nothing to write");
  assert.equal(d.__wsRename, null);
  flush();
  assert.equal(chip.el.dataset.renaming, undefined, "the crumb is back");
  assert.equal(calls.listeners, 0, "listener released");
});

test("an emptied field closes silently rather than renaming to nothing", async () => {
  const { d, calls } = desk({ typed: "   ", current: "Design" });
  d._bindWorkspaceRenameDismiss();
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.equal(calls.confirm.length, 0);
  assert.equal(calls.commit.length, 0);
  assert.equal(d.__wsRename, null);
});

test("changed text asks before doing anything", async () => {
  const { d, calls } = desk({ typed: "Design 2026", current: "Design" });
  d._bindWorkspaceRenameDismiss();
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.equal(calls.confirm.length, 1, "the user is asked");
  const o = calls.confirm[0];
  assert.equal(o.confirm, "Save");
  assert.equal(o.cancel, "Discard");
  assert.ok(String(o.message).includes("Design 2026"), "the card shows the new name");
  // No backdrop: the question is about the name in the chip behind the card,
  // and dimming it makes it harder to check. confirm() defaults to "scrim", so
  // this has to be asked for explicitly and must not be dropped by accident.
  assert.equal(o.overlay, "none");
});

test("the listener is detached BEFORE the confirm opens", async () => {
  // Otherwise the click that dismisses the dialog re-enters this path and
  // stacks a second confirm on top of the first.
  const { d, calls } = desk({ typed: "Design 2026" });
  d._bindWorkspaceRenameDismiss();
  const p = d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.equal(calls.listeners, 0, "released before the dialog is up");
  await p;
});

test("Save commits the typed name and refreshes the breadcrumb", async () => {
  const { d, calls, chip, flush } = desk({ typed: "Design 2026", confirm: "save" });
  d._bindWorkspaceRenameDismiss();
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.deepEqual(calls.commit, ["Design 2026"]);
  assert.equal(calls.crumb, 1, "the chip must not keep the old name");
  assert.equal(d.__wsRename, null);
  flush();
  assert.equal(chip.el.dataset.renaming, undefined);
});

test("Discard closes without writing", async () => {
  const { d, calls, chip, flush } = desk({ typed: "Design 2026", confirm: "discard" });
  d._bindWorkspaceRenameDismiss();
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.equal(calls.commit.length, 0, "no write");
  assert.equal(d.__wsRename, null);
  flush();
  assert.equal(chip.el.dataset.renaming, undefined);
  assert.equal(calls.listeners, 0);
});

test("a failed write still closes the editor and says so", async () => {
  const { d, calls, chip, flush } = desk({ typed: "Design 2026", confirm: "save", posted: "reject" });
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.deepEqual(calls.commit, ["Design 2026"]);
  assert.equal(calls.crumb, 0, "nothing was renamed, so nothing to re-resolve");
  assert.equal(d.__wsRename, null, "the editor does not hang around");
  flush();
  assert.equal(chip.el.dataset.renaming, undefined);
  assert.equal(calls.warned.length, 1);
});

test("a commit with nothing to post still closes", async () => {
  const { d, calls } = desk({ typed: "Design 2026", confirm: "save", posted: "none" });
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.deepEqual(calls.commit, ["Design 2026"]);
  assert.equal(d.__wsRename, null);
});

test("a dismissal with no edit in flight just releases the listener", async () => {
  const { d, calls } = desk();
  d._bindWorkspaceRenameDismiss();
  d.__wsRename = null;
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.equal(calls.listeners, 0);
  assert.equal(calls.confirm.length, 0);
});

// ── The Save button ─────────────────────────────────────────────────────────
//
// Pressing Save IS the decision, so unlike clicking away it never asks. It
// takes the same two decisions Enter takes.

test("Save writes the typed name and refreshes the breadcrumb", async () => {
  const { d, calls, chip, flush } = desk({ typed: "Design 2026", current: "Design" });
  d._bindWorkspaceRenameDismiss();
  await d._saveWorkspaceRename();
  assert.equal(calls.confirm.length, 0, "pressing Save is not ambiguous");
  assert.deepEqual(calls.commit, ["Design 2026"]);
  assert.equal(calls.crumb, 1);
  assert.equal(d.__wsRename, null);
  flush();
  assert.equal(chip.el.dataset.renaming, undefined, "the crumb is back");
});

test("Save on unchanged text closes without writing", async () => {
  const { d, calls } = desk({ typed: "Design", current: "Design" });
  d._bindWorkspaceRenameDismiss();
  await d._saveWorkspaceRename();
  assert.equal(calls.commit.length, 0, "nothing changed, nothing to write");
  assert.equal(calls.confirm.length, 0);
  assert.equal(d.__wsRename, null);
});

test("Save on an emptied field closes rather than renaming to nothing", async () => {
  const { d, calls } = desk({ typed: "  ", current: "Design" });
  d._bindWorkspaceRenameDismiss();
  await d._saveWorkspaceRename();
  assert.equal(calls.commit.length, 0);
  assert.equal(d.__wsRename, null);
});

test("Save releases the click-outside listener", async () => {
  const { d, calls } = desk({ typed: "Design 2026" });
  d._bindWorkspaceRenameDismiss();
  assert.equal(calls.listeners, 1);
  await d._saveWorkspaceRename();
  assert.equal(calls.listeners, 0);
});

test("pressing Save is not an outside click", async () => {
  // The button lives INSIDE .desk-module-topbar__ws-rename, so the document
  // listener must read its mousedown as inside and leave the edit alone — the
  // press that follows is the Save handler's business. Without this the
  // dismissal would fire first and raise the Save/Discard prompt on top of the
  // very button the user just pressed.
  const { d, calls } = desk({ typed: "Design 2026" });
  d._bindWorkspaceRenameDismiss();
  await d._dismissWorkspaceRename(target(".desk-module-topbar__ws-rename"));
  assert.equal(calls.confirm.length, 0);
  assert.equal(calls.commit.length, 0);
  assert.ok(d.__wsRename, "the edit survives to be saved");
  assert.equal(calls.listeners, 1);
});

test("Save with no edit in flight is a no-op", async () => {
  const { d, calls } = desk();
  d.__wsRename = null;
  await d._saveWorkspaceRename();
  assert.equal(calls.commit.length, 0);
});

// ── Show / close animation ─────────────────────────────────────────────────
//
// The box is animated with `data-anim`, the desk's own convention. Only the
// VISUAL teardown waits for it — the state teardown stays synchronous, so the
// six paths that end an edit keep the ordering they already had.

test("ending stamps data-anim=out and holds the field until it has played", () => {
  const { d, box, chip, pending } = desk({ typed: "Design" });
  d._endWorkspaceRename();
  assert.equal(box.el.dataset.anim, "out", "the out animation is running");
  assert.equal(box.fed, undefined, "the field is still on screen");
  assert.equal(chip.el.dataset.renaming, "1", "and the crumb is still hidden");
  assert.equal(pending(), 1);
});

test("the field goes and the crumb returns once the animation is over", () => {
  const { d, box, chip, flush } = desk({ typed: "Design" });
  d._endWorkspaceRename();
  flush();
  assert.deepEqual(box.fed, [], "the slot is emptied");
  assert.equal(chip.el.dataset.renaming, undefined, "the crumb is back");
  assert.equal(box.el.dataset.anim, undefined, "and the flag is cleaned up");
});

test("a second ending cancels the first — reopening cannot be emptied under", () => {
  // Escape, then Rename again inside the animation window. Without the cancel
  // the first timer fires against the NEW editor and blanks it.
  const { d, box, pending, flush } = desk({ typed: "Design" });
  d._endWorkspaceRename();
  d._endWorkspaceRename();
  assert.equal(pending(), 1, "one pending teardown, not two");
  flush();
  assert.deepEqual(box.fed, []);
});

test("a destroyed box is torn down at once rather than animated", () => {
  const { d, chip, pending } = desk({ typed: "Design" });
  d.__wsRename.box.isDestroyed = () => true;
  d._endWorkspaceRename();
  assert.equal(pending(), 0, "nothing to animate, nothing to wait for");
  assert.equal(chip.el.dataset.renaming, undefined, "the crumb comes back now");
});
