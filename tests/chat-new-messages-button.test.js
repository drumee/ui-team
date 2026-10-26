// chat-new-messages-button.test.js — the "N New messages" jump button.
//
//   node --test tests/chat-new-messages-button.test.js
//
// The button counted EVERY inbound message since the chat mounted and nothing
// ever hid it, so an open chat panel showed "27 New messages" for messages the
// user had long read. It must count only what arrives while the user is
// scrolled away from the bottom, and clear when they get back there. Runs the
// real widget_chat methods against a stub `this`.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs
  .readFileSync(
    path.join(__dirname, "../src/drumee/builtins/widget/chat/index.js"),
    "utf8",
  )
  .replace(/\r\n/g, "\n");

const _ = {
  isArray: Array.isArray,
  isEmpty: (v) => v == null || (typeof v === "object" && !Object.keys(v).length),
  isFunction: (v) => typeof v === "function",
};
const _a = { type: "type" };
const Visitor = { id: "me" };

const make = (sig) =>
  new Function("_", "_a", "Visitor", `return ${sliceFunction(SRC, sig)}`)(
    _,
    _a,
    Visitor,
  );

const handleReceivedMsg = make("handleReceivedMsg(data)");
const onListScrolled = make("_onListScrolled(list)");
const clearNewMessages = make("_clearNewMessages()");
const noteNewMessage = make("_noteNewMessage(data)");

function chat({ pinned }) {
  const button = { el: { dataset: { count: 0 } }, state: 0 };
  button.setState = (s) => (button.state = s);
  const rows = [];
  const c = {
    _newMsgCount: 0,
    _pinnedToBottom: pinned,
    __buttonScroll: button,
    __list: {
      getItemsByAttr: () => [],
      append: (d) => rows.push(d),
    },
    itemKind: () => "widget_chat_item",
    mget: () => undefined,
    trigger() {},
  };
  c._noteNewMessage = noteNewMessage.bind(c);
  c._clearNewMessages = clearNewMessages.bind(c);
  return { c, button, rows };
}

const msg = (id, author = "peer") => ({ message_id: id, author_id: author });

test("a message read at the bottom does not count or show the button", () => {
  const { c, button, rows } = chat({ pinned: true });
  handleReceivedMsg.call(c, msg("m1"));
  handleReceivedMsg.call(c, msg("m2"));
  assert.equal(rows.length, 2);
  assert.equal(c._newMsgCount, 0);
  assert.equal(button.state, 0);
});

test("messages arriving while scrolled up count and show the button", () => {
  const { c, button } = chat({ pinned: false });
  handleReceivedMsg.call(c, msg("m1"));
  handleReceivedMsg.call(c, msg("m2"));
  assert.equal(c._newMsgCount, 2);
  assert.equal(button.el.dataset.count, 2);
  assert.equal(button.state, 1);
});

test("my own message from another device never counts as new", () => {
  const { c, button } = chat({ pinned: false });
  handleReceivedMsg.call(c, msg("m1", "me"));
  assert.equal(c._newMsgCount, 0);
  assert.equal(button.state, 0);
});

test("scrolling back to the bottom clears and hides the button", () => {
  const { c, button } = chat({ pinned: false });
  handleReceivedMsg.call(c, msg("m1"));
  assert.equal(button.state, 1);
  onListScrolled.call(c, { scrolledY: () => 10 });
  assert.equal(c._pinnedToBottom, true);
  assert.equal(c._newMsgCount, 0);
  assert.equal(button.el.dataset.count, 0);
  assert.equal(button.state, 0);
});

test("scrolling up away from the bottom keeps the count", () => {
  const { c, button } = chat({ pinned: false });
  handleReceivedMsg.call(c, msg("m1"));
  onListScrolled.call(c, { scrolledY: () => 600 });
  assert.equal(c._pinnedToBottom, false);
  assert.equal(c._newMsgCount, 1);
  assert.equal(button.state, 1);
});
