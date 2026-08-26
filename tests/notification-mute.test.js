// Notification popup mute — Round 3 Phase 3, the CHAT half (xlsx row 6).
//
// Requires the SHIPPED modules and drives them against stubbed globals, so the
// assertions run over the real code rather than a paraphrase of it.
//
// What is pinned here:
//
//  · MUTE SUPPRESSES THE CARD AND NOTHING ELSE. The panel's feed, badge and
//    tab counts are not reachable from this module at all, and a test below
//    asserts that neither module so much as mentions them.
//  · It FAILS OPEN. An unread state, a server with no such service, a rejected
//    request — all of them leave popups working exactly as they do today. The
//    opposite default would let one failed request silence a user silently.
//  · The scope picker swaps IN PLACE, in the same shell, with no auto-dismiss.
//    A chooser that vanishes mid-decision is worse than no chooser.
//  · A confirmation is shown ONLY when the write actually landed. The server
//    reports that honestly because its driver swallows SQL errors and returns
//    undefined instead of throwing; confirming regardless would tell the user
//    a workspace is muted when the next message will pop up all the same.
//  · Every user-controlled string is escaped — Note renders content as MARKUP.
const test = require("node:test");
const assert = require("node:assert/strict");
const { join } = require("node:path");

// ------------------------------------------------------------------ globals
// Read off the global scope exactly as the runtime injects them; never passed
// as harness parameters (see harness-hygiene.test.js).
global._ = require("lodash");
global.LOCALE = new Proxy(
  {
    MUTE: "Mute",
    OPEN: "Open",
    CLOSE: "Close",
    JUST_NOW: "Just now",
    NEW_MESSAGE: "New message",
    MUTE_NOTIFICATION_FROM: "Mute notifications from",
    MUTE_THIS_WORKSPACE: "This workspace",
    MUTE_ALL_WORKSPACES: "All workspaces",
    MUTE_DONE_WORKSPACE: "Notifications muted for this workspace",
    MUTE_DONE_ALL: "Notifications muted for all workspaces",
    MUTE_FAILED: "Could not mute notifications",
  },
  { get: (t, k) => (k in t ? t[k] : String(k)) },
);
global._a = new Proxy({}, { get: (_t, k) => String(k) });
global.SERVICE = {
  media: { get_node_attr: "media.get_node_attr" },
  activity: { mute_state: "activity.mute_state", mute_set: "activity.mute_set" },
};

const node = (type) => (o = {}) => ({ type, ...o, kids: (o.kids || []).filter(Boolean) });
global.Skeletons = {
  Box: { Y: node("box-y"), X: node("box-x") },
  Note: node("note"),
  Image: { Svg: node("svg") },
  Button: { Svg: node("button"), Label: node("button-label") },
  Avatar: (ava, cn, name) => ({ type: "avatar", ava, className: cn, name }),
};

let VISITOR_ID = "me";
global.Visitor = { get id() { return VISITOR_ID; }, avatar: (id) => `avatar:${id}` };

let APPENDED = [];
global.Wm = {
  getItemsByKind: () => [],
  windowsLayer: {
    append: (tree) => {
      const listeners = [];
      const attrs = { ...(tree.attrOpt || {}) };
      const byClass = new Map();
      (function walk(n) {
        if (!n || typeof n !== "object") return;
        if (n.className && !byClass.has(n.className)) {
          byClass.set(n.className, { textContent: n.content == null ? "" : String(n.content) });
        }
        (n.kids || []).forEach(walk);
      })(tree);
      const el = {
        addEventListener: (n, fn, capture) => listeners.push({ n, fn, capture }),
        getAttribute: (k) => (k in attrs ? attrs[k] : null),
        querySelector: (sel) => byClass.get(sel.replace(/^\./, "")) || null,
        get isConnected() { return inst.attached; },
        remove() { inst.attached = false; },
      };
      const inst = {
        tree, el, listeners,
        destroyed: false,
        attached: true,
        isDestroyed() { return this.destroyed; },
        // 🚨 FAITHFUL TO THE REAL WIDGET, measured on the endpoint 2026-08-26:
        // goodbye() returns without throwing and does NOT destroy the view or
        // detach the node. The previous stub marked it destroyed — i.e. the
        // stub was MORE CAPABLE than reality, which is exactly why the suite
        // stayed green while the shipped card never left the screen.
        goodbye() { /* no-op, exactly as measured */ },
        destroy() { this.destroyed = true; this.attached = false; },
      };
      APPENDED.push(inst);
      return inst;
    },
  },
};

const BASE = join(__dirname, "../src/drumee/builtins/panel/activity");
const { showChatToast, killChatToast, applyMute, showScopePicker } = require(join(BASE, "chat-toast.js"));
const {
  isPopupMuted, setMute, loadMuteState, muteState, resetMuteState,
} = require(join(BASE, "mute.js"));

// ------------------------------------------------------------------ helpers
const HOSTS = [];
function panel(over = {}) {
  const h = {
    activityState: 0,
    warn: () => {},
    calls: [],
    // Default: the write lands.
    answer: { status: "ok", global: 0, hubs: [] },
    fetchService(svc, p) { this.calls.push({ kind: "get", svc, p }); return Promise.resolve(this.answer); },
    postService(svc, p) { this.calls.push({ kind: "post", svc, p }); return Promise.resolve(this.answer); },
    ...over,
  };
  HOSTS.push(h);
  return h;
}
test.after(() => HOSTS.forEach(killChatToast));

const msg = (over = {}) => ({
  author_id: "someone",
  firstname: "Sarah",
  message: "Can you check the latest draft?",
  hub_id: "H1",
  ...over,
});

function reset() {
  APPENDED = [];
  VISITOR_ID = "me";
  resetMuteState();
}

function find(tree, className) {
  if (!tree) return null;
  if (tree.className === className) return tree;
  for (const k of tree.kids || []) {
    const hit = find(k, className);
    if (hit) return hit;
  }
  return null;
}
// Matches on the FIRST class so `__scope __scope--one` is findable by either.
function findAny(tree, cls) {
  if (!tree) return null;
  const list = String(tree.className || "").split(/\s+/);
  if (list.includes(cls)) return tree;
  for (const k of tree.kids || []) {
    const hit = findAny(k, cls);
    if (hit) return hit;
  }
  return null;
}
const card = () => APPENDED[APPENDED.length - 1];
const state = () => (card().tree.attrOpt || {})["data-state"];

// ------------------------------------------------------- the mute predicate

test("nothing is muted until the state has been read — it fails OPEN", () => {
  reset();
  assert.equal(isPopupMuted(msg()), false);
  assert.equal(muteState().loaded, 0);
});

test("a global mute silences every workspace, including a push with none", () => {
  reset();
  applyMuteStateFromServer({ global: 1, hubs: [] });
  assert.equal(isPopupMuted(msg({ hub_id: "H1" })), true);
  assert.equal(isPopupMuted(msg({ hub_id: "" })), true);
  assert.equal(isPopupMuted(msg({ hub_id: undefined })), true);
});

test("a per-workspace mute silences only that workspace", () => {
  reset();
  applyMuteStateFromServer({ global: 0, hubs: ["H1"] });
  assert.equal(isPopupMuted(msg({ hub_id: "H1" })), true);
  assert.equal(isPopupMuted(msg({ hub_id: "H2" })), false);
  // A p2p DM carries no workspace, so no per-workspace row can match it —
  // only a global mute can silence it.
  assert.equal(isPopupMuted(msg({ hub_id: "" })), false);
  assert.equal(isPopupMuted(msg({ hub_id: null })), false);
});

test("a numeric hub id from the server still matches", () => {
  reset();
  applyMuteStateFromServer({ global: 0, hubs: [7] });
  assert.equal(isPopupMuted(msg({ hub_id: 7 })), true);
  assert.equal(isPopupMuted(msg({ hub_id: "7" })), true);
});

function applyMuteStateFromServer(d) {
  const { applyMuteState } = require(join(BASE, "mute.js"));
  applyMuteState(d);
}

// ------------------------------------------------------------- suppression

test("a muted workspace shows NO card; an unmuted one still does", () => {
  reset();
  applyMuteStateFromServer({ global: 0, hubs: ["H1"] });
  showChatToast(panel(), msg({ hub_id: "H1" }), "#/x");
  assert.equal(APPENDED.length, 0, "muted workspace produces no card");

  showChatToast(panel(), msg({ hub_id: "H2" }), "#/x");
  assert.equal(APPENDED.length, 1, "a different workspace is unaffected");
});

test("mute is the LAST guard — it never masks a structural reason", () => {
  reset();
  applyMuteStateFromServer({ global: 1, hubs: [] });
  // Own message and Center-open both already returned before mute is consulted;
  // what matters is that none of them throw or show a card.
  showChatToast(panel({ activityState: 1 }), msg(), "#/x");
  showChatToast(panel(), msg({ author_id: "me" }), "#/x");
  assert.equal(APPENDED.length, 0);
});

// ----------------------------------------------------------- the scope picker

test("Mute swaps the card for the picker IN PLACE, in the same shell", () => {
  reset();
  const h = panel();
  showChatToast(h, msg(), "#/x");
  const first = card();
  assert.equal(state(), undefined, "the message card carries no state flag");

  // Click Mute through the real capture-phase delegate.
  clickIn(first, "panel-activity-toast__mute");

  assert.equal(APPENDED.length, 2, "a new card was mounted");
  assert.equal(card().tree.className, "panel-activity-toast", "SAME shell class");
  assert.equal(state(), "picker");
  assert.equal(first.destroyed, true, "the message card was replaced, not stacked on");
  assert.equal((card().tree.attrOpt || {})["data-replace"], "1", "no entry animation");
});

test("the picker offers this workspace and all workspaces", () => {
  reset();
  const h = panel();
  showScopePicker(h, msg({ hub_id: "H9" }));
  const one = findAny(card().tree, "panel-activity-toast__scope--one");
  const all = findAny(card().tree, "panel-activity-toast__scope--all");
  assert.ok(one, "the per-workspace option is offered");
  assert.ok(all, "the global option is offered");
  assert.equal(one.attrOpt["data-scope"], "H9", "carries the workspace id");
  assert.equal(all.attrOpt["data-scope"], "", "empty scope means all workspaces");
  assert.equal(all.content, "All workspaces");
});

test("a push with no workspace offers ONLY the global scope", () => {
  reset();
  showScopePicker(panel(), msg({ hub_id: "" }));
  assert.equal(findAny(card().tree, "panel-activity-toast__scope--one"), null,
    "there is no workspace id to write, so no per-workspace option");
  assert.ok(findAny(card().tree, "panel-activity-toast__scope--all"));
});

test("the picker names the workspace, ESCAPED", () => {
  reset();
  // Note renders content as MARKUP — an unescaped name is script injection.
  showScopePicker(panel(), msg({ hub_id: "H1", folder_name: '<img src=x onerror="boom()">' }));
  const one = findAny(card().tree, "panel-activity-toast__scope--one");
  assert.ok(!/<img/.test(one.content), `escaped, got ${one.content}`);
  assert.match(one.content, /&lt;img/);
});

test("the picker does NOT auto-dismiss", async () => {
  reset();
  const h = panel();
  showScopePicker(h, msg());
  assert.equal(h._chatToastTimer, undefined,
    "no timer: a chooser must not vanish mid-decision");
  // The message card, by contrast, does set one.
  reset();
  const h2 = panel();
  showChatToast(h2, msg(), "#/x");
  assert.ok(h2._chatToastTimer, "the message card still expires on its own");
});

// ------------------------------------------------------------ writing a mute

test("choosing a scope writes it, and confirms only on success", async () => {
  reset();
  const h = panel({ answer: { status: "ok", global: 0, hubs: ["H1"] } });
  showScopePicker(h, msg({ hub_id: "H1" }));
  await applyMute(h, "H1");

  const post = h.calls.find((c) => c.kind === "post");
  assert.equal(post.svc, "activity.mute_set");
  assert.equal(post.p.hub_id, "H1");
  assert.equal(post.p.muted, 1);
  assert.equal(state(), "done");
  assert.equal(
    find(card().tree, "panel-activity-toast__result-text").content,
    "Notifications muted for this workspace",
  );
  // The cache now reflects what the SERVER said, not what we asked for.
  assert.equal(isPopupMuted(msg({ hub_id: "H1" })), true);
});

test("the global scope confirms with the all-workspaces line", async () => {
  reset();
  const h = panel({ answer: { status: "ok", global: 1, hubs: [] } });
  showScopePicker(h, msg());
  await applyMute(h, "");
  assert.equal(h.calls.find((c) => c.kind === "post").p.hub_id, "");
  assert.equal(
    find(card().tree, "panel-activity-toast__result-text").content,
    "Notifications muted for all workspaces",
  );
});

test("a write that did NOT land is reported, never confirmed", async () => {
  reset();
  const h = panel({ answer: { status: "error", global: 0, hubs: [] } });
  showScopePicker(h, msg({ hub_id: "H1" }));
  await applyMute(h, "H1");

  assert.equal(state(), "failed");
  assert.equal(
    find(card().tree, "panel-activity-toast__result-text").content,
    "Could not mute notifications",
  );
  // And nothing was cached — the next message must still pop up, matching
  // what the database actually holds.
  assert.equal(isPopupMuted(msg({ hub_id: "H1" })), false);
});

test("a FAILED write must not move the cache, whatever it returns with", async () => {
  reset();
  // The payload deliberately carries a state that WOULD change something if it
  // were applied. A failed call returning stale or partial state must not be
  // allowed to silence the user's workspaces as a side effect of failing — the
  // cache may only ever follow a write that actually landed.
  const h = panel({ answer: { status: "error", global: 1, hubs: ["H1", "H2"] } });
  const r = await setMute(h, "H1", true);
  assert.equal(r.ok, false);
  assert.equal(muteState().global, 0, "a failed write did not set a global mute");
  assert.equal(isPopupMuted(msg({ hub_id: "H1" })), false);
  assert.equal(isPopupMuted(msg({ hub_id: "H2" })), false);
});

test("a rejected request is survived and reported the same way", async () => {
  reset();
  const h = panel({ postService: () => Promise.reject(new Error("offline")) });
  showScopePicker(h, msg({ hub_id: "H1" }));
  await assert.doesNotReject(() => applyMute(h, "H1"));
  assert.equal(state(), "failed");
  assert.equal(isPopupMuted(msg({ hub_id: "H1" })), false);
});

test("a card the user already closed is not resurrected by a late reply", async () => {
  reset();
  const h = panel();
  showScopePicker(h, msg({ hub_id: "H1" }));
  const picker = h._chatToast;
  const before = APPENDED.length;
  killChatToast(h); // the user dismissed it while the write was in flight
  await applyMute(h, "H1", picker);
  assert.equal(APPENDED.length, before, "no confirmation card appears over nothing");

  // The SAME must hold for a caller that does not identify its card — the
  // second guard only compares when it is given something to compare against,
  // so the "is there a card at all" check has to stand on its own. (Both
  // halves of a belt-and-braces pair must be independently load-bearing, or
  // one of them is decoration that a later edit will quietly delete.)
  await applyMute(h, "H1");
  assert.equal(APPENDED.length, before, "still nothing, with no card identified");
});

test("a message that arrives mid-write keeps its card — the confirmation yields", async () => {
  reset();
  const h = panel();
  showScopePicker(h, msg({ hub_id: "H1" }));
  const picker = h._chatToast;
  // A new message lands while the mute request is still in flight and mounts
  // its own card. Confirming over it would silently eat that popup.
  showChatToast(h, msg({ hub_id: "H2", message: "later" }), "#/y");
  const newer = h._chatToast;
  assert.notEqual(newer, picker);

  await applyMute(h, "H1", picker);
  assert.equal(h._chatToast, newer, "the newer message card is still the live one");
  assert.equal(state(), undefined, "and it is still a message card, not a confirmation");
});

test("the confirmation dismisses itself", async () => {
  reset();
  const h = panel();
  showScopePicker(h, msg({ hub_id: "H1" }));
  await applyMute(h, "H1");
  assert.ok(h._chatToastTimer, "a dismiss timer is armed for the confirmation");
});

// ------------------------------------------------------------- unmute + load

test("unmute sends 0 — the value the server reads as unmute", async () => {
  reset();
  const h = panel({ answer: { status: "ok", global: 0, hubs: [] } });
  const r = await setMute(h, "H1", false);
  assert.equal(r.ok, true);
  const post = h.calls.find((c) => c.kind === "post");
  assert.equal(post.p.muted, 0);
  assert.equal(isPopupMuted(msg({ hub_id: "H1" })), false);
});

test("loadMuteState reads once and populates the cache", async () => {
  reset();
  const h = panel({ answer: { global: 0, hubs: ["H5"] } });
  await loadMuteState(h);
  assert.equal(h.calls[0].svc, "activity.mute_state");
  assert.equal(isPopupMuted(msg({ hub_id: "H5" })), true);
  assert.equal(muteState().loaded, 1);
});

test("a server that does not know these endpoints is survived", async () => {
  reset();
  const saved = global.SERVICE.activity;
  global.SERVICE.activity = {}; // an older server: no such service
  const h = panel();
  await loadMuteState(h);
  const r = await setMute(h, "H1", true);
  global.SERVICE.activity = saved;

  assert.equal(h.calls.length, 0, "nothing is posted to an undefined service");
  assert.equal(r.ok, false);
  assert.equal(isPopupMuted(msg({ hub_id: "H1" })), false, "and popups keep working");
});

test("a rejected state read leaves popups working", async () => {
  reset();
  const h = panel({ fetchService: () => Promise.reject(new Error("boom")) });
  await assert.doesNotReject(() => loadMuteState(h));
  assert.equal(isPopupMuted(msg({ hub_id: "H1" })), false);
});

// ----------------------------------------------------------- card lifetime

test("the message card lasts 30 s; the confirmation 2 s; the picker forever", () => {
  const { CHAT_TOAST_MS, CHAT_CONFIRM_MS } = require(join(BASE, "chat-toast.js"));
  // Raised 10 -> 20 -> 30 s on Duy's call 2026-08-26: the card carries a Mute
  // button and a scope choice behind it, so it is something to act on, not
  // just to read. The meeting cards use the same number.
  assert.equal(CHAT_TOAST_MS, 30000, "message card lifetime");
  assert.equal(CHAT_CONFIRM_MS, 2000, "the confirmation is an acknowledgement, not a message");
  assert.ok(CHAT_CONFIRM_MS < CHAT_TOAST_MS, "an acknowledgement must not outlive the message");

  // And the picker must still arm NO timer at all — a decision in progress is
  // never taken away, however long the message card lives.
  reset();
  const h = panel();
  showScopePicker(h, msg());
  assert.equal(h._chatToastTimer, undefined, "the picker has no timeout");
});

// ------------------------------------------------------------- card removal

test("killChatToast really DETACHES the card — goodbye() alone does not", () => {
  reset();
  const h = panel();
  showChatToast(h, msg(), "#/x");
  const inst = card();
  assert.equal(inst.attached, true, "mounted");

  killChatToast(h);

  // 🚨 The bug this defends, found by the first live DOM measurement on
  // 2026-08-26: goodbye() is a NO-OP for a card appended straight to the
  // windows layer, so the shipped card was never removed. The
  // auto-dismiss did nothing, and every later message stacked another card on
  // top of the last. Both symptoms come from this one line.
  assert.equal(inst.attached, false, "the node must be detached, not just forgotten");
  assert.equal(inst.isDestroyed(), true, "and the view destroyed");
  assert.equal(h._chatToast, null, "and the panel's pointer cleared");
});

test("a widget whose destroy() does NOT detach is still cleared from the DOM", () => {
  reset();
  // The second half of the belt-and-braces pair. destroy() detaches for the
  // widget we measured, so without this case the DOM fallback would be
  // unprovable — and an unprovable guard is the kind a later edit deletes as
  // dead code. Here destroy() marks the view destroyed but leaves the node
  // attached, which is precisely the failure the fallback exists for.
  const layer = global.Wm.windowsLayer;
  const made = [];
  global.Wm.windowsLayer = {
    append: (tree) => {
      const inst = {
        tree, listeners: [], destroyed: false, attached: true,
        isDestroyed() { return this.destroyed; },
        goodbye() {},
        destroy() { this.destroyed = true; },     // marks, does NOT detach
      };
      inst.el = {
        addEventListener() {}, getAttribute: () => null, querySelector: () => null,
        get isConnected() { return inst.attached; },
        remove() { inst.attached = false; },
      };
      made.push(inst);
      return inst;
    },
  };
  try {
    const h = panel();
    showChatToast(h, msg(), "#/x");
    killChatToast(h);
    assert.equal(made[0].attached, false,
      "the DOM fallback must detach a node destroy() left behind");
  } finally {
    global.Wm.windowsLayer = layer;
  }
});

test("every state swap leaves exactly ONE live card", async () => {
  reset();
  const h = panel();
  showChatToast(h, msg(), "#/x");
  showChatToast(h, msg({ message: "second" }), "#/x");
  showScopePicker(h, msg());
  await applyMute(h, "H1", h._chatToast);

  const live = APPENDED.filter((a) => a.attached);
  assert.equal(live.length, 1, `exactly one card on screen, got ${live.length}`);
  assert.equal(live[0], h._chatToast, "and it is the one the panel points at");
});

// ------------------------------------------------- the topbar mute switch
//
// 🚨 WHY THIS CONTROL HAS TO EXIST. A global mute silences every popup, and the
// scope picker lives INSIDE a popup — so once everything is muted there is no
// toast left to open the picker from. Without a control in the Center's own
// topbar, muting all workspaces would be a ONE-WAY DOOR with no way back.

test("the topbar carries a mute switch wired to toggle-mute", () => {
  reset();
  const topbar = require(join(BASE, "skeleton/topbar.js"));
  const tree = topbar({ fig: { family: "panel-activity" }, _unreadsOnly: 1 });
  const t = findAny(tree, "panel-activity__mute-toggle");
  assert.ok(t, "the switch is rendered");
  assert.equal(t.service, "toggle-mute", "wired to the panel's handler");
  assert.equal(t.sys_pn, "mute-toggle", "addressable for repainting");
});

test("the switch reflects the STORED global flag, not a guess", () => {
  const topbar = require(join(BASE, "skeleton/topbar.js"));
  const read = () => {
    delete require.cache[require.resolve(join(BASE, "skeleton/topbar.js"))];
    const tb = require(join(BASE, "skeleton/topbar.js"));
    return findAny(tb({ fig: { family: "panel-activity" } }), "panel-activity__mute-toggle").state;
  };
  reset();
  assert.equal(read(), 0, "nothing muted -> off");
  applyMuteStateFromServer({ global: 1, hubs: [] });
  assert.equal(read(), 1, "globally muted -> on");
  // A per-workspace mute is NOT a global mute and must not light the switch,
  // or turning it "off" would clear mutes the user never set globally.
  reset();
  applyMuteStateFromServer({ global: 0, hubs: ["H1"] });
  assert.equal(read(), 0, "a per-workspace mute leaves the global switch off");
});

test("every descendant of the switch is active:0", () => {
  reset();
  const topbar = require(join(BASE, "skeleton/topbar.js"));
  const t = findAny(topbar({ fig: { family: "panel-activity" } }), "panel-activity__mute-toggle");
  // ui-core's mergeKidsOptions discards its own map result, so `kidsOpt` is a
  // no-op, and `active` does not cascade — any active element in the click path
  // binds its own onclick and __handleClick's stopPropagation kills the event
  // before `toggle-mute` can fire. Every descendant must carry it explicitly.
  (function walk(n, depth) {
    for (const k of n.kids || []) {
      assert.equal(k.active, 0,
        `descendant ${k.className} at depth ${depth} must be active:0`);
      walk(k, depth + 1);
    }
  })(t, 1);
});

test("_toggleMute writes the GLOBAL scope and repaints from stored state", () => {
  const { readFileSync } = require("node:fs");
  const src = readFileSync(join(BASE, "index.js"), "utf8");
  const at = src.indexOf("async _toggleMute()");
  assert.ok(at > -1, "_toggleMute must exist");
  const body = src.slice(at, src.indexOf("\n  }", at));

  assert.ok(/setMute\(this, '', !wasGlobal\)/.test(body),
    "it toggles the GLOBAL scope, derived from the stored flag");
  // 🚨 The switch must be painted from the CACHE, which setMute only advances
  // on success — never optimistically from what we asked for. A switch that
  // flipped anyway would tell the user their notifications are off while the
  // next message pops up regardless.
  assert.ok(/_syncMuteToggle\(\)/.test(body), "it repaints from stored state");
  assert.ok(!/dataset\.state\s*=/.test(body),
    "it must not paint the switch directly — that would bypass the success check");
  assert.ok(/if \(!ok\)/.test(body), "a failed write is reported");
});

// --------------------------------------------------------- scope containment

test("mute never reaches the feed, the badge or the tab counts", () => {
  const { readFileSync } = require("node:fs");
  // 🚨 Comments MUST be stripped first. Both files explain at length which
  // feed paths mute must stay away from, so a raw text search matches the
  // very comment that documents the rule and the assertion fires on its own
  // documentation. (Same trap as the conference.start negative assertion.)
  const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const mute = strip(readFileSync(join(BASE, "mute.js"), "utf8"));
  const toast = strip(readFileSync(join(BASE, "chat-toast.js"), "utf8"));
  for (const [name, src] of [["mute.js", mute], ["chat-toast.js", toast]]) {
    for (const forbidden of ["get_feed", "unread_counts", "activity.list", "mark_all_read"]) {
      assert.ok(
        !src.includes(forbidden),
        `${name} must not touch ${forbidden} — mute suppresses the popup only`,
      );
    }
  }
  // And the guard must be capable of failing: the stripper must not have
  // eaten the actual code along with the comments.
  assert.ok(mute.includes("mute_set") && toast.includes("showChatToast"),
    "the comment stripper left the real code intact");
});

// Clicks through the module's OWN capture-phase delegate, so the test exercises
// the real listener rather than calling an internal directly.
function clickIn(inst, className) {
  const target = {
    closest: (sel) => (sel === `.${className}` ? { getAttribute: () => null } : null),
  };
  for (const l of inst.listeners) l.fn({ target, stopPropagation() {} });
}
