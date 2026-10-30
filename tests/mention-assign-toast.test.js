// Pop-ups for being @-mentioned and for being assigned a task (Lexis,
// 2026-10-29): panel/activity/notice-toast.js decides, chat-toast.js draws.
//
//   node --test tests/mention-assign-toast.test.js
//
// The two modules run for real against stubbed globals: Skeletons builds plain
// objects, and the layer records what is appended.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "..");
const DIR = resolve(ROOT, "src/drumee/builtins/panel/activity");
const read = (f) => readFileSync(resolve(ROOT, f), "utf8");

// ---------------------------------------------------------------- globals
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
global._ = {
  escape: (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]),
  isFunction: (f) => typeof f === "function",
};
global._a = { task: "task", meeting: "meeting", chat: "chat", cross: "cross", nid: "nid" };
global.LOCALE = {
  TASK_ASSIGNED_ACTION: "assigned you to ",
  TASK_MENTION_ACTION: "mentioned you in ",
  MENTIONED_YOU_IN_ACTION: "mentioned you in ",
  MENTIONED_YOU: "mentioned you",
  OPEN: "Open",
  MUTE: "Mute",
  JUST_NOW: "Just now",
  SOMEONE: "Someone",
  NEW_MESSAGE: "New message",
};
global.Visitor = { id: "me" };
global.SERVICE = { media: { get_node_attr: "media.get_node_attr" } };
global.location = { hash: "" };
const node = (type) => (o = {}) => ({ type, ...o });
global.Skeletons = {
  Box: { X: node("X"), Y: node("Y") },
  Note: node("Note"),
  UserProfile: node("UserProfile"),
  Image: { Svg: node("Svg") },
  Button: { Svg: node("ButtonSvg") },
};

const appended = [];
function fakeView(tree) {
  let destroyed = false;
  const listeners = [];
  return {
    tree,
    el: {
      isConnected: true,
      remove() {},
      getAttribute: (k) => (tree.attrOpt || {})[k],
      addEventListener: (ev, fn) => listeners.push(fn),
      querySelector: () => null,
    },
    listeners,
    isDestroyed: () => destroyed,
    destroy() {
      destroyed = true;
    },
  };
}
global.Wm = {
  getMeetingToastPool: () => ({
    append(tree) {
      const v = fakeView(tree);
      appended.push(v);
      return v;
    },
  }),
};

const chat = require(resolve(DIR, "chat-toast.js"));
const { noticeFor, toastNotice } = require(resolve(DIR, "notice-toast.js"));
const mute = require(resolve(DIR, "mute.js"));

// Every Note's content in a tree, in order.
function notes(tree, out = []) {
  if (!tree || typeof tree !== "object") return out;
  if (tree.type === "Note") out.push(tree.content);
  for (const k of tree.kids || []) notes(k, out);
  return out;
}
function find(tree, pred) {
  if (!tree || typeof tree !== "object") return null;
  if (pred(tree)) return tree;
  for (const k of tree.kids || []) {
    const r = find(k, pred);
    if (r) return r;
  }
  return null;
}
const host = () => ({ activityState: 0, warn() {} });
const SENDER = { sender: { uid: "ann", id: "ann", firstname: "Ann", fullname: "Ann Lee" } };

// ---------------------------------------------------------------- markers
test("plainMessage reads person and file markers back as @Name", () => {
  assert.strictEqual(
    chat.plainMessage("hi [@Duy N](user:me) see [@a.pdf](mention:h1:n1) [x](link:y)"),
    "hi @Duy N see @a.pdf [x](link:y)",
  );
  assert.strictEqual(chat.plainMessage(null), "");
});

test("mentionsMe: array, stored JSON string, absent, malformed", () => {
  assert.strictEqual(chat.mentionsMe({ mention_ids: ["x", "me"] }), true);
  assert.strictEqual(chat.mentionsMe({ mention_ids: '["me"]' }), true);
  assert.strictEqual(chat.mentionsMe({ mention_ids: '["x"]' }), false);
  assert.strictEqual(chat.mentionsMe({}), false);
  assert.strictEqual(chat.mentionsMe({ mention_ids: "{bad" }), false);
});

// ---------------------------------------------------------------- chat card
test("chat card: a mention says so, shows @Name, wears the @ badge", () => {
  appended.length = 0;
  chat.showChatToast(host(), {
    author_id: "ann", firstname: "Ann", hub_id: "h1",
    message: "[@Duy](user:me) look", mention_ids: '["me"]',
  }, "#/x");
  const t = appended[0].tree;
  assert.ok(notes(t).includes("mentioned you: @Duy look"));
  assert.ok(find(t, (n) => n.type === "Svg" && n.ico === "noti-at"));
});

test("chat card: an ordinary message is unchanged apart from marker text", () => {
  appended.length = 0;
  chat.showChatToast(host(), { author_id: "ann", firstname: "Ann", hub_id: "h1", message: "hello" }, "#/x");
  const t = appended[0].tree;
  assert.ok(notes(t).includes("hello"));
  assert.ok(find(t, (n) => n.type === "Svg" && n.ico === "noti-chats-circle"));
  assert.ok(notes(t).includes("Mute"), "chat card keeps Mute");
});

test("chat card: a muted workspace still silences a mention (Duy 10-29)", () => {
  appended.length = 0;
  mute.resetMuteState();
  mute.muteState().hubs.add("h1");
  chat.showChatToast(host(), { author_id: "ann", hub_id: "h1", message: "x", mention_ids: ["me"] }, "#/x");
  assert.strictEqual(appended.length, 0);
  mute.resetMuteState();
});

// ---------------------------------------------------------------- notices
test("task.assigned → assigned you to <task>, opens the task", () => {
  const n = noticeFor("task.assigned", { hub_id: "h1", nid: "f1", task_id: 7, title: "Ship it" }, SENDER);
  assert.strictEqual(n.model.line, "assigned you to Ship it");
  assert.strictEqual(n.model.fullname, "Ann Lee");
  assert.strictEqual(n.model.author_id, "ann");
  assert.match(n.url, /^#\/desk\/wm\/reveal\/\?hub_id=h1&nid=f1&filetype=folder&pid=0&activeTab=task&open_task_id=7&ts=\d+$/);
});

test("task.assigned with no folder opens the workspace root", () => {
  const n = noticeFor("task.assigned", { hub_id: "h1", nid: null, id: 9, title: "T" }, SENDER);
  assert.match(n.url, /nid=0&.*open_task_id=9/);
});

test("task.mention: only a real mention raises a pop-up", () => {
  const d = { hub_id: "h1", nid: "f1", task_id: 7, title: "T" };
  assert.ok(noticeFor("task.mention", d, { ...SENDER, kind: "mention" }));
  for (const kind of ["reply", "comment", "priority", "moved", undefined]) {
    assert.strictEqual(noticeFor("task.mention", d, { ...SENDER, kind }), null, `kind ${kind}`);
  }
});

test("room.mention → mentioned you in <meeting>, opens its card on the calendar", () => {
  const n = noticeFor("room.mention",
    { hub_id: "h1", nid: "m1", pid: "p1", stime: 1800000000, title: "Sync", folder_name: "Design" }, SENDER);
  assert.strictEqual(n.model.line, "mentioned you in Sync");
  assert.strictEqual(n.model.folder_name, "Design");
  assert.strictEqual(
    n.url.replace(/&ts=\d+$/, ""),
    "#/desk/wm/reveal/?hub_id=h1&nid=p1&filetype=folder&pid=0&activeTab=meeting&open_meeting_nid=m1&open_meeting_stime=1800000000",
  );
});

test("file comment: only when it names me, never when muted", () => {
  const d = {
    hub_id: "h1", author_id: "ann", firstname: "Ann", message: "[@Duy](user:me) ok?",
    mention_ids: '["me"]', message_id: "msg1",
    file_thread: { file_nid: "n9", folder_nid: "f1" },
  };
  const n = noticeFor("channel.file_thread_post", d, {});
  assert.strictEqual(n.model.line, "mentioned you: @Duy ok?");
  assert.strictEqual(n.model.author_id, "ann");
  assert.strictEqual(typeof n.onOpen, "function");
  assert.strictEqual(noticeFor("channel.file_thread_post", { ...d, mention_ids: '["x"]' }, {}), null);
  mute.resetMuteState();
  mute.muteState().hubs.add("h1");
  assert.strictEqual(noticeFor("channel.file_thread_post", d, {}), null);
  mute.resetMuteState();
});

test("nothing for unrelated pushes or a push without a workspace", () => {
  assert.strictEqual(noticeFor("channel.post", { hub_id: "h1" }, SENDER), null);
  assert.strictEqual(noticeFor("media.new", { hub_id: "h1" }, SENDER), null);
  assert.strictEqual(noticeFor("task.assigned", {}, SENDER), null);
  assert.strictEqual(noticeFor("task.assigned", null, SENDER), null);
});

// ---------------------------------------------------------------- showing
test("notice card: shell, line escaped, Open only (no Mute)", () => {
  appended.length = 0;
  toastNotice(host(), "task.assigned", { hub_id: "h1", nid: "f1", task_id: 1, title: "<b>x</b>" }, SENDER);
  assert.strictEqual(appended.length, 1);
  const t = appended[0].tree;
  assert.strictEqual(t.className, "panel-activity-toast");
  const ns = notes(t);
  assert.ok(ns.includes("Ann Lee"));
  assert.ok(ns.includes("assigned you to &lt;b&gt;x&lt;/b&gt;"));
  assert.ok(ns.includes("Open"));
  assert.ok(!ns.includes("Mute"));
  assert.ok(find(t, (n) => n.type === "Svg" && n.ico === "noti-plus-circle"));
  assert.match(t.attrOpt["data-url"], /open_task_id=1/);
});

test("notice card replaces the chat card (one slot, never stacked)", () => {
  appended.length = 0;
  const h = host();
  chat.showChatToast(h, { author_id: "ann", firstname: "Ann", hub_id: "h1", message: "hi" }, "#/x");
  toastNotice(h, "task.assigned", { hub_id: "h1", task_id: 1, title: "T" }, SENDER);
  assert.strictEqual(appended.length, 2);
  assert.strictEqual(appended[0].isDestroyed(), true);
  assert.strictEqual(h._chatToast, appended[1]);
  chat.killChatToast(h);
});

test("a stale chat card landing right after a notice does not replace it", () => {
  appended.length = 0;
  const h = host();
  toastNotice(h, "task.assigned", { hub_id: "h1", task_id: 1, title: "T" }, SENDER);
  chat.showChatToast(h, { author_id: "ann", firstname: "Ann", hub_id: "h1", message: "hi" }, "#/x");
  assert.strictEqual(appended.length, 1);
  assert.strictEqual(h._chatToast, appended[0]);
  // Once the hold has passed, the next message takes the slot as usual.
  h._chatToast._noticeAt = Date.now() - chat.NOTICE_HOLD_MS - 1;
  chat.showChatToast(h, { author_id: "ann", firstname: "Ann", hub_id: "h1", message: "hi" }, "#/x");
  assert.strictEqual(appended.length, 2);
  assert.strictEqual(appended[0].isDestroyed(), true);
  chat.killChatToast(h);
});

test("a sender known only by email is named by it", () => {
  appended.length = 0;
  toastNotice(host(), "task.assigned", { hub_id: "h1", title: "T" }, { sender: { uid: "ann", email: "ann@x.io" } });
  assert.ok(notes(appended[0].tree).includes("ann@x.io"));
});

test("no notice while the Notification Center is open, nor for my own action", () => {
  appended.length = 0;
  toastNotice({ ...host(), activityState: 1 }, "task.assigned", { hub_id: "h1", title: "T" }, SENDER);
  toastNotice(host(), "task.assigned", { hub_id: "h1", title: "T" }, { sender: { uid: "me" } });
  assert.strictEqual(appended.length, 0);
});

test("Open runs onOpen when given, the hash otherwise", () => {
  const click = (view, cls) =>
    view.listeners[0]({ target: { closest: (sel) => (sel === `.panel-activity-toast__${cls}` ? {} : null) }, stopPropagation() {} });
  appended.length = 0;
  let opened = 0;
  const h = host();
  chat.showNoticeToast(h, { author_id: "ann", line: "x" }, "#/fallback", () => { opened += 1; });
  location.hash = "";
  click(appended[0], "open");
  assert.strictEqual(opened, 1);
  assert.strictEqual(location.hash, "");
  assert.strictEqual(appended[0].isDestroyed(), true);

  chat.showNoticeToast(h, { author_id: "ann", line: "x" }, "#/plain");
  click(appended[1], "open");
  assert.strictEqual(location.hash, "#/plain");
});

test("a throwing push never escapes toastNotice", () => {
  const bad = { get hub_id() { throw new Error("boom"); } };
  assert.doesNotThrow(() => toastNotice(host(), "task.assigned", bad, SENDER));
});

// ---------------------------------------------------------------- wiring
test("panel wiring: every push is offered, room.mention refreshes the feed", () => {
  const src = read("src/drumee/builtins/panel/activity/index.js");
  assert.match(src, /toastNotice\(this, options\.service, data\[0\], options\);\n\s*switch \(options\.service\)/);
  assert.match(src, /case "room\.mention":/);
});

test("feed row: a meeting mention reads 'mentioned you in', not 'invited you to'", () => {
  const src = read("src/drumee/builtins/panel/activity/widget/item/skeleton/index.js");
  assert.match(src, /case 'mention':\s*\n(?:.*\n){2}\s*return \{\s*\n\s*before: LOCALE\.MENTIONED_YOU_IN_ACTION,/);
});

test("the item widget exposes its file-comment opener for the pop-up", () => {
  const src = read("src/drumee/builtins/panel/activity/widget/item/index.js");
  assert.match(src, /__activity_item\.openFileOwnerActivity = openFileOwnerActivity;/);
});
