// commentUnreadBadge: the comment icon + unread count in a detail-panel subtask
// row's `subtask-row-end`. Pure descriptor builder, run with stub Skeletons.
//
//   node --test tests/tasks-comment-unread-badge.test.js
const test = require("node:test");
const assert = require("node:assert");

global.Skeletons = {
  Box: { X: (o) => ({ ...o, kind: "box" }) },
  Note: (o) => ({ ...o, kind: "note" }),
  Image: { Svg: (o) => ({ ...o, kind: "svg" }) },
};
global.LOCALE = { TASK_UNREAD_COMMENTS: "{0} unread comments" };
if (!String.prototype.format) {
  // eslint-disable-next-line no-extend-native
  String.prototype.format = function (...a) {
    return this.replace(/\{(\d+)\}/g, (m, i) => (a[i] != null ? a[i] : m));
  };
}

const { commentUnreadBadge } = require("../src/drumee/builtins/window/tasks/skeleton/helpers");

const pfx = "tasks-panel";
const ui = (n) => ({ getCommentUnread: () => n });
const t = { id: "A" };

test("returns null at 0 unread", () => {
  assert.strictEqual(commentUnreadBadge(ui(0), t, pfx), null);
});

test("renders icon + count", () => {
  const b = commentUnreadBadge(ui(3), t, pfx);
  assert.strictEqual(b.className, "tasks-panel__subtask-comments");
  assert.strictEqual(b.active, 0);
  assert.strictEqual(b.attrOpt.title, "3 unread comments");
  const svg = b.kids.find((k) => k.kind === "svg");
  const note = b.kids.find((k) => k.kind === "note");
  assert.strictEqual(svg.ico, "noti-chats-circle");
  assert.strictEqual(note.content, "3");
  assert.strictEqual(note.className, "tasks-panel__subtask-comments-count");
});

test("caps at 99+", () => {
  const b = commentUnreadBadge(ui(150), t, pfx);
  const note = b.kids.find((k) => k.kind === "note");
  assert.strictEqual(note.content, "99+");
  assert.strictEqual(b.attrOpt.title, "150 unread comments");
});

test("tolerates a ui without getCommentUnread", () => {
  assert.strictEqual(commentUnreadBadge({}, t, pfx), null);
});
