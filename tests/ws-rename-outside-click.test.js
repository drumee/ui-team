// Clicking outside the workspace-rename editor closes it
// (modules/desk/index.js — _dismissWorkspaceRename and friends).
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

const METHODS = [
  "_bindWorkspaceRenameDismiss",
  "_unbindWorkspaceRenameDismiss",
  "_dismissWorkspaceRename",
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

  const field = { value: typed };
  const box = {
    el: { querySelector: (s) => (/textarea|input/.test(s) ? field : null) },
    feed: () => { box.fed = 1; },
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
    "_", "_a", "LOCALE", "Wm", "document",
    `return { ${METHODS.map(grab).join(",\n")} };`,
  )(
    { isFunction: (f) => typeof f === "function" },
    { value: "value", nid: "nid" },
    { SAVE_CHANGES: "Save Changes", SAVE: "Save", DISCARD: "Discard" },
    Wm,
    doc,
  );

  d.fig = { family: "desk-module" };
  d.warn = (...a) => calls.warned.push(a);
  d.__wsRename = { tile, current, hubId: 7, box, chip };
  d._crumbGroupPart = chip;
  d._wsRenamePart = box;
  return { d, calls, chip, box };
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
  const { d, calls, chip } = desk({ typed: "Design", current: "Design" });
  d._bindWorkspaceRenameDismiss();
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.equal(calls.confirm.length, 0, "nothing to ask about");
  assert.equal(calls.commit.length, 0, "nothing to write");
  assert.equal(d.__wsRename, null);
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
  const { d, calls, chip } = desk({ typed: "Design 2026", confirm: "save" });
  d._bindWorkspaceRenameDismiss();
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.deepEqual(calls.commit, ["Design 2026"]);
  assert.equal(calls.crumb, 1, "the chip must not keep the old name");
  assert.equal(d.__wsRename, null);
  assert.equal(chip.el.dataset.renaming, undefined);
});

test("Discard closes without writing", async () => {
  const { d, calls, chip } = desk({ typed: "Design 2026", confirm: "discard" });
  d._bindWorkspaceRenameDismiss();
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.equal(calls.commit.length, 0, "no write");
  assert.equal(d.__wsRename, null);
  assert.equal(chip.el.dataset.renaming, undefined);
  assert.equal(calls.listeners, 0);
});

test("a failed write still closes the editor and says so", async () => {
  const { d, calls, chip } = desk({ typed: "Design 2026", confirm: "save", posted: "reject" });
  await d._dismissWorkspaceRename(target(".desk-module__body"));
  assert.deepEqual(calls.commit, ["Design 2026"]);
  assert.equal(calls.crumb, 0, "nothing was renamed, so nothing to re-resolve");
  assert.equal(d.__wsRename, null, "the editor does not hang around");
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
