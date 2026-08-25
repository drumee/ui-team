// Real-time chat toast — Round 3 Phase 2, the CHAT half.
//
// This requires the SHIPPED module and drives it against stubbed globals, so
// the assertions run over the real code rather than a paraphrase of it.
//
// What is pinned here is the set of rules Duy settled on 2026-08-22 plus the
// hazards found while wiring it:
//
//  · replace, never stack — a second message kills the first card and
//    restarts the 10 s timer;
//  · nothing while the Notification Center is open;
//  · chat only, and a meeting card posted into a folder chat is NOT chat;
//  · never a card for my own message;
//  · every user-controlled string is escaped — Note renders its content as
//    markup, so an unescaped message is a script injection.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

// ------------------------------------------------------------------ globals
// The module reads these off the global scope, exactly as the runtime injects
// them. They are NOT passed as harness parameters anywhere in this file — see
// harness-hygiene.test.js.
global._ = require("lodash");
global.LOCALE = new Proxy(
  { MUTE: "Mute", OPEN: "Open", JUST_NOW: "Just now", CLOSE: "Close", NEW_MESSAGE: "New message" },
  { get: (t, k) => (k in t ? t[k] : String(k)) },
);
global._a = new Proxy({}, { get: (_t, k) => String(k) });

const node = (type) => (o = {}) => ({ type, ...o, kids: (o.kids || []).filter(Boolean) });
global.Skeletons = {
  Box: { Y: node("box-y"), X: node("box-x") },
  Note: node("note"),
  Image: { Svg: node("svg") },
  Button: { Svg: node("button") },
  Avatar: (ava, cn, name) => ({ type: "avatar", ava, className: cn, name }),
};

let VISITOR_ID = "me";
global.Visitor = { get id() { return VISITOR_ID; }, avatar: (id) => `avatar:${id}` };

let OPEN_WINDOWS = [];
let APPENDED = [];
global.Wm = {
  getItemsByKind: () => OPEN_WINDOWS,
  windowsLayer: {
    append: (tree) => {
      const listeners = [];
      const attrs = { ...(tree.attrOpt || {}) };
      const el = {
        addEventListener: (n, fn, capture) => listeners.push({ n, fn, capture }),
        getAttribute: (k) => (k in attrs ? attrs[k] : null),
      };
      const inst = {
        tree,
        el,
        listeners,
        destroyed: false,
        isDestroyed() { return this.destroyed; },
        goodbye() { this.destroyed = true; },
      };
      APPENDED.push(inst);
      return inst;
    },
  },
};

const MOD = join(__dirname, "../src/drumee/builtins/panel/activity/chat-toast.js");
const { showChatToast, killChatToast, folderLabel, senderLabel, CHAT_TOAST_MS } = require(MOD);

// ------------------------------------------------------------------ helpers
// Every panel handed out is tracked so its pending 10 s dismiss timer can be
// cleared at the end — otherwise a real timer holds the process open and the
// whole suite takes ten seconds to exit.
const HOSTS = [];
function panel(over = {}) {
  const h = { activityState: 0, warn: () => {}, ...over };
  HOSTS.push(h);
  return h;
}
test.after(() => HOSTS.forEach(killChatToast));
const msg = (over = {}) => ({
  author_id: "someone",
  firstname: "Sarah",
  message: "Can you check the latest draft?",
  ...over,
});

function reset() {
  APPENDED = [];
  OPEN_WINDOWS = [];
  VISITOR_ID = "me";
}

// Walk the captured skeleton tree for a node by className.
function find(tree, className) {
  if (!tree) return null;
  if (tree.className === className) return tree;
  for (const k of tree.kids || []) {
    const hit = find(k, className);
    if (hit) return hit;
  }
  return null;
}
const card = () => APPENDED[APPENDED.length - 1];
const text = (cn) => {
  const n = find(card().tree, `panel-activity-toast__${cn}`);
  return n ? n.content : null;
};

// ------------------------------------------------------------------- guards

test("no card while the Notification Center is open", () => {
  reset();
  showChatToast(panel({ activityState: 1 }), msg(), "#/x");
  assert.equal(APPENDED.length, 0);
});

test("never a card for my own message", () => {
  reset();
  showChatToast(panel(), msg({ author_id: "me" }), "#/x");
  assert.equal(APPENDED.length, 0);
  // Somebody else's still shows.
  showChatToast(panel(), msg({ author_id: "other" }), "#/x");
  assert.equal(APPENDED.length, 1);
});

test("a missing window layer is survived, not thrown through", () => {
  reset();
  const layer = global.Wm.windowsLayer;
  global.Wm.windowsLayer = null;
  assert.doesNotThrow(() => showChatToast(panel(), msg(), "#/x"));
  global.Wm.windowsLayer = layer;
});

// ------------------------------------------------------- replace, not stack

test("a second message REPLACES the card and never stacks", () => {
  reset();
  const host = panel();
  showChatToast(host, msg({ message: "first" }), "#/a");
  const first = card();
  showChatToast(host, msg({ message: "second" }), "#/b");

  assert.equal(APPENDED.length, 2, "a new card is built");
  assert.ok(first.destroyed, "the previous card is gone — the two never coexist");
  assert.equal(host._chatToast, card(), "the panel tracks exactly one card");
  assert.equal(text("message"), "second");
});

test("the replacing card suppresses the entry animation", () => {
  reset();
  const host = panel();
  showChatToast(host, msg(), "#/a");
  assert.equal(card().tree.attrOpt["data-replace"], "0", "the first card animates in");
  showChatToast(host, msg(), "#/b");
  assert.equal(card().tree.attrOpt["data-replace"], "1", "the replacement does not");
});

test("the 10 s dismiss timer is restarted by the second message", () => {
  reset();
  const host = panel();
  const realSet = global.setTimeout;
  const realClear = global.clearTimeout;
  const set = [];
  const cleared = [];
  let id = 0;
  global.setTimeout = (fn, ms) => { set.push(ms); return ++id; };
  global.clearTimeout = (i) => cleared.push(i);
  try {
    showChatToast(host, msg(), "#/a");
    showChatToast(host, msg(), "#/b");
    assert.deepEqual(set, [CHAT_TOAST_MS, CHAT_TOAST_MS], "each message arms a fresh 10 s timer");
    assert.deepEqual(cleared, [1], "and the previous one is cleared, so it cannot fire early");
  } finally {
    global.setTimeout = realSet;
    global.clearTimeout = realClear;
  }
});

test("killChatToast is safe on a panel that never had a card", () => {
  assert.doesNotThrow(() => killChatToast(panel()));
  assert.doesNotThrow(() => killChatToast(null));
});

// -------------------------------------------------------------- the content

test("the card is built to the Figma structure", () => {
  reset();
  showChatToast(panel(), msg(), "#/target");
  const t = card().tree;
  assert.equal(t.className, "panel-activity-toast");
  for (const cn of ["__head", "__avatar-wrap", "__badge", "__body", "__title-row", "__sender", "__message", "__time", "__close", "__actions", "__mute", "__open"]) {
    assert.ok(find(t, `panel-activity-toast${cn}`), `${cn} is missing from the card`);
  }
  assert.equal(text("time"), "Just now");
  assert.equal(text("mute"), "Mute");
  assert.equal(text("open"), "Open");
  assert.equal(t.attrOpt["data-url"], "#/target");
});

test("the two actions are inert Notes, so no descendant eats the click", () => {
  reset();
  showChatToast(panel(), msg(), "#/x");
  // ui-core's __handleClick calls stopPropagation BEFORE triggerHandlers, so
  // an ACTIVE widget in the click path swallows the event. The meeting toast
  // uses Notes for exactly this reason.
  assert.equal(find(card().tree, "panel-activity-toast__mute").type, "note");
  assert.equal(find(card().tree, "panel-activity-toast__open").type, "note");
});

test("the click delegate is bound in the CAPTURE phase", () => {
  reset();
  showChatToast(panel(), msg(), "#/x");
  const l = card().listeners;
  assert.equal(l.length, 1);
  assert.equal(l[0].n, "click");
  assert.equal(l[0].capture, true, "ui-core's own onclick ends in stopImmediatePropagation");
});

test("the folder chip is shown when the folder window is open and dropped when it is not", () => {
  reset();
  // No nid at all — a workspace-level post.
  showChatToast(panel(), msg(), "#/x");
  assert.equal(find(card().tree, "panel-activity-toast__chip"), null);

  // nid present but no window open: the live push carries no folder name, and
  // inventing one is worse than omitting the chip.
  reset();
  showChatToast(panel(), msg({ nid: "N1" }), "#/x");
  assert.equal(find(card().tree, "panel-activity-toast__chip"), null);

  // Window open on that node.
  reset();
  OPEN_WINDOWS = [{ isDestroyed: () => false, mget: (k) => ({ nid: "N1", filename: "Design" }[k]) }];
  showChatToast(panel(), msg({ nid: "N1" }), "#/x");
  assert.equal(text("chip"), "Design");
});

test("folderLabel ignores a destroyed window and a non-matching nid", () => {
  reset();
  OPEN_WINDOWS = [{ isDestroyed: () => true, mget: (k) => ({ nid: "N1", filename: "Design" }[k]) }];
  assert.equal(folderLabel({ nid: "N1" }), "");
  OPEN_WINDOWS = [{ isDestroyed: () => false, mget: (k) => ({ nid: "OTHER", filename: "Design" }[k]) }];
  assert.equal(folderLabel({ nid: "N1" }), "");
  assert.equal(folderLabel({}), "");
});

test("senderLabel falls back rather than rendering blank", () => {
  assert.equal(senderLabel({ firstname: "F", username: "U" }), "F");
  assert.equal(senderLabel({ username: "U" }), "U");
  assert.equal(senderLabel({ lastname: "L" }), "L");
  assert.equal(senderLabel({}), "New message");
});

test("every user-controlled string is escaped", () => {
  reset();
  OPEN_WINDOWS = [{ isDestroyed: () => false, mget: (k) => ({ nid: "N1", filename: '<img src=x onerror=1>' }[k]) }];
  showChatToast(
    panel(),
    msg({ nid: "N1", firstname: '<b>S</b>', message: '<script>alert(1)</script>' }),
    "#/x",
  );
  // Note renders content as markup — this is the injection guard.
  assert.ok(!text("message").includes("<script>"), "the message must be escaped");
  assert.ok(text("message").includes("&lt;script&gt;"));
  assert.ok(!text("sender").includes("<b>"), "the sender name must be escaped");
  assert.ok(!text("chip").includes("<img"), "the folder name must be escaped");
});

test("a message that is only whitespace renders no message line at all", () => {
  reset();
  showChatToast(panel(), msg({ message: "   " }), "#/x");
  assert.equal(find(card().tree, "panel-activity-toast__message"), null);
  // The card is still valid — sender and time remain.
  assert.equal(text("time"), "Just now");
});

// -------------------------------------------------------------- the wiring

const PANEL = join(__dirname, "../src/drumee/builtins/panel/activity/index.js");
const src = readFileSync(PANEL, "utf8");

test("the raw message is captured BEFORE the switch that rewrites it", () => {
  // The MEETING:start branch overwrites opt.message with "X joined the
  // meeting Y", so a marker test performed after the switch would let a
  // meeting card through as a chat message.
  const raw = src.indexOf("const rawMessage");
  const sw = src.indexOf("switch (data.service)");
  const call = src.indexOf("showChatToast(this");
  assert.ok(raw > -1 && sw > -1 && call > -1, "the wiring moved");
  assert.ok(raw < sw, "rawMessage must be read before the switch mutates opt.message");
  assert.ok(call > sw, "the card is decided after the switch has resolved the url");
});

test("the card is raised before every OS-notification guard", () => {
  const call = src.indexOf("showChatToast(this");
  for (const guard of [
    "if (!window.Notification) return;",
    'if (Notification.permission === "denied") return;',
    "(now - this._last_notified) < 5000",
  ]) {
    const at = src.indexOf(guard);
    assert.ok(at > -1, `guard moved: ${guard}`);
    assert.ok(
      call < at,
      `the in-app card must not inherit the OS notification's "${guard}"`,
    );
  }
});

test("the card is gated on the chat services and excludes meeting posts", () => {
  const at = src.indexOf("showChatToast(this");
  const gate = src.slice(src.lastIndexOf("if (", at), at);
  assert.ok(/SERVICE\.chat\.post/.test(gate), "chat.post must be in the gate");
  assert.ok(/SERVICE\.channel\.post/.test(gate), "channel.post must be in the gate");
  assert.ok(/MEETING/.test(gate), "a meeting post must be excluded");
  assert.ok(/rawMessage/.test(gate), "the exclusion must test the pre-switch message");
});

test("the card is cleaned up when the Center opens and when the panel dies", () => {
  const open = src.indexOf("case 'open-activity-panel':");
  assert.ok(open > -1);
  assert.ok(
    /killChatToast\(this\)/.test(src.slice(open, open + 320)),
    "a card already on screen must go when the Center opens",
  );
  const destroy = src.indexOf("onDestroy() {");
  assert.ok(destroy > -1);
  assert.ok(
    /killChatToast\(this\)/.test(src.slice(destroy, destroy + 520)),
    "the card outlives the panel — it lives in the window layer",
  );
});
