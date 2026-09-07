// A Designation link must leave the desk STANDING IN THE WORKSPACE that holds
// the file — not on the home grid Drumee 2.0 dropped.
//
// Two things are pinned here, and they fail in different ways:
//
//  1. THE ORDER. headlessLayer (the docked workspace pane) sits later in the
//     DOM than windowsLayer, so with both layers non-empty they tie on z-index
//     and the pane paints OVER the floating file; the layer hosting the ACTIVE
//     window breaks the tie (wm/skin `:has(> [data-state="1"])` → z 50001).
//     Mounting and AWAITING the pane before launching the file is what makes
//     the file the last window opened, so windowsLayer takes the lift. Swap the
//     two and the player disappears behind the workspace — silently, with no
//     error, which is exactly how the secure-share panel once ended up under
//     the document player. A unit test can hold that order even though it
//     cannot see a pixel.
//
//  2. THE FALLBACKS. Docking is an ENHANCEMENT: no hub_id, an unmountable
//     workspace, or a throw must still open the file exactly as before. A
//     designation link that opens nothing is far worse than one that opens on
//     the wrong screen.
//
// The method is executed for real — extracted from the source and run against
// stubs — rather than asserted as text, so these are behavioural claims. The
// route wiring underneath is structural, and comments are stripped first so a
// comment mentioning a call can never satisfy an assertion.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(ROOT, p), "utf8");
const strip = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const WM = "src/drumee/modules/desk/wm/index.js";
const SRC = strip(read(WM));

/** Pull `openDesignationLink` out of the class and make it callable. */
function loadOpener() {
  const m = SRC.match(/async openDesignationLink\(payload = \{\}\) \{\n([\s\S]*?)\n  \}\n/);
  assert.ok(m, "openDesignationLink not found — did the signature change?");
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
  return new AsyncFunction("payload", m[1]);
}

/** A window manager stub that records the call order. */
function stubWm({ docked = null, loadWorkspace, awaited = "pane" } = {}) {
  const calls = [];
  return {
    calls,
    _findWorkspaceWindow(hub_id) {
      calls.push(`find:${hub_id}`);
      return docked;
    },
    loadWorkspace(arg) {
      calls.push(`load:${arg.hub_id}:${arg.nid}`);
      if (loadWorkspace) return loadWorkspace(arg);
    },
    _awaitWorkspaceWindow(hub_id) {
      calls.push(`await:${hub_id}`);
      return Promise.resolve(awaited);
    },
    openFileLocation(p) {
      calls.push(`open:${p && p.nid}`);
      return "opened";
    },
    warn(...a) {
      calls.push(`warn:${a[0]}`);
    },
  };
}

test("docks the workspace, then opens the file — in that order", async () => {
  const fn = loadOpener();
  const wm = stubWm();
  const out = await fn.call(wm, { nid: "n1", hub_id: "h1" });

  assert.deepEqual(wm.calls, [
    "find:h1",
    "load:h1:0",
    "await:h1",
    "open:n1",
  ]);
  // The file open is the value the callers get back.
  assert.equal(out, "opened");
});

test("the pane is AWAITED before the file launches — the paint-order guarantee", async () => {
  const fn = loadOpener();
  const wm = stubWm();
  await fn.call(wm, { nid: "n1", hub_id: "h1" });

  const awaitedAt = wm.calls.indexOf("await:h1");
  const openedAt = wm.calls.indexOf("open:n1");
  assert.ok(awaitedAt > -1 && openedAt > -1);
  assert.ok(
    awaitedAt < openedAt,
    "the workspace pane must be awaited BEFORE openFileLocation, or the pane paints over the file",
  );
});

test("mounts at the workspace ROOT (nid 0), not at the file", async () => {
  const fn = loadOpener();
  const wm = stubWm();
  await fn.call(wm, { nid: "n1", hub_id: "h1" });
  assert.ok(
    wm.calls.includes("load:h1:0"),
    "nid 0 is the server's 'this hub's root' shortcut; passing the file's nid would open the wrong pane",
  );
});

test("already standing in the workspace → does not remount it", async () => {
  const fn = loadOpener();
  const wm = stubWm({ docked: { it: "is here" } });
  await fn.call(wm, { nid: "n1", hub_id: "h1" });

  assert.deepEqual(wm.calls, ["find:h1", "open:n1"]);
});

test("no hub_id → opens the file exactly as before", async () => {
  const fn = loadOpener();
  const wm = stubWm();
  await fn.call(wm, { nid: "n1" });

  assert.deepEqual(wm.calls, ["open:n1"]);
});

test("a throw while docking still opens the file", async () => {
  const fn = loadOpener();
  const wm = stubWm({
    loadWorkspace() {
      throw new Error("no access");
    },
  });
  const out = await fn.call(wm, { nid: "n1", hub_id: "h1" });

  assert.ok(
    wm.calls.some((c) => c.startsWith("open:n1")),
    "the file must still open when the workspace cannot be docked",
  );
  assert.equal(out, "opened");
  assert.ok(wm.calls.some((c) => c.startsWith("warn:")), "and it should say so");
});

test("a workspace that never mounts still opens the file", async () => {
  const fn = loadOpener();
  const wm = stubWm({ awaited: null });
  const out = await fn.call(wm, { nid: "n1", hub_id: "h1" });

  assert.equal(out, "opened");
});

test("called with no payload at all, it does not throw", async () => {
  const fn = loadOpener();
  const wm = stubWm();
  await fn.call(wm, undefined);
  assert.deepEqual(wm.calls, ["open:undefined"]);
});

// ── route wiring ───────────────────────────────────────────────────────────

test("both Designation-link shapes and the post-signin relay go through the opener", () => {
  // The long form, the compact `/o/` twin and openDeepLinkHash are the three
  // ways a designation link is opened. All three must dock.
  assert.ok(
    /openDeepLinkHash\(hash\) \{[\s\S]*?openDesignationLink\(/.test(SRC),
    "openDeepLinkHash must route through openDesignationLink",
  );
  assert.ok(
    /path\[2\] === _a\.open\)[\s\S]{0,120}?openDesignationLink\(args\)/.test(SRC),
    "the long `open` form must route through openDesignationLink",
  );
  assert.ok(
    /parseCompactPath\(path\)[\s\S]*?openDesignationLink\(compact\)/.test(SRC),
    "the compact `/o/` form must route through openDesignationLink",
  );
});

test("the four non-designation shapes keep the opener they had", () => {
  // folder | file | edit | play are NOT designation links — libs/file-deep-link
  // draws the same line in its LONG/COMPACT regexes — so they must still reach
  // openFileLocation directly and gain no workspace pane.
  const group = SRC.match(
    /case _a\.folder:[\s\S]*?case _a\.open:([\s\S]*?)\n      case /,
  );
  assert.ok(group, "the shared case group is gone — re-read this before editing");
  assert.ok(
    /this\.openFileLocation\(args\);/.test(group[1]),
    "the non-designation shapes must still call openFileLocation directly",
  );
});
