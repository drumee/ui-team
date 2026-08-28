const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const chatSource = readFileSync(
  join(__dirname, "../src/drumee/builtins/widget/chat/index.js"),
  "utf8",
);
const folderSource = readFileSync(
  join(__dirname, "../src/drumee/builtins/window/folder/index.js"),
  "utf8",
);

function extractClassMethod(source, name) {
  const start = source.indexOf(`  ${name}(`);
  assert.notEqual(start, -1, `${name} not found in production source`);
  const end = source.indexOf("\n  }\n", start);
  assert.notEqual(end, -1, `${name} has no closing brace`);
  const method = source.slice(start, end + 4).trim();
  return `function ${name}${method.slice(name.length)}`;
}

const underscore = {
  isArray: Array.isArray,
  isFunction: (value) => typeof value === "function",
};
const attrs = {
  area: "area",
  type: "type",
  personal: "personal",
  privateRoom: "private-room",
  dmz: "dmz",
  public: "public",
  share: "share",
  private: "private",
  ticket: "ticket",
  ui: "ui",
  list: "list",
};
const services = {
  contact: {},
  channel: {},
  chat: {},
  media: {},
};
const visitor = { id: "viewer-a" };

function compileMethod(name) {
  return new Function(
    "_",
    "_a",
    "SERVICE",
    "Visitor",
    "require",
    `return (${extractClassMethod(chatSource, name)});`,
  )(underscore, attrs, services, visitor, require);
}

function compileFolderMethod(name) {
  return new Function(
    "_",
    "_a",
    `return (${extractClassMethod(folderSource, name)});`,
  )(underscore, attrs);
}

const matchesScopedChannel = compileMethod("matchesScopedChannel");
const onWsMessage = compileMethod("onWsMessage");
const notifyFileThreadCreated = compileMethod("_notifyFileThreadCreated");
const getSendThreadId = compileMethod("_getSendThreadId");
const onFileThreadCreated = compileFolderMethod("onFileThreadCreated");

function fileThreadEvent({ fileNid, fileThreadId, messageId }) {
  return {
    author_id: "viewer-b",
    file_thread_id: fileThreadId,
    file_thread: {
      file_nid: fileNid,
      file_thread_id: fileThreadId,
    },
    hub_id: "hub-1",
    message_id: messageId,
  };
}

function makeChat({ fileNid = "file-z", fileThreadId = "thread-z" } = {}) {
  const received = [];
  const acknowledged = [];
  const chat = {
    area: attrs.private,
    fileThreadId,
    hubId: "hub-1",
    peerId: "",
    scopedFileNid: fileNid,
    getHandlers() {
      return [{ isHidden: () => false }];
    },
    getScopedNid() {
      return "";
    },
    handleReceivedMsg(data) {
      received.push(data);
    },
    isFileThreadMode() {
      return Boolean(this.scopedFileNid);
    },
    matchesScopedChannel,
    mget(key) {
      return key === attrs.area || key === attrs.type ? this.area : undefined;
    },
    postService(data) {
      acknowledged.push(data);
    },
    _ftSvc(name) {
      return `channel.file_thread_${name}`;
    },
    _removeTyper() {},
  };
  return { acknowledged, chat, received };
}

function receive(chat, data) {
  onWsMessage.call(chat, null, data, {
    service: "channel.file_thread_post",
  });
}

test("a sibling file-thread event cannot replace the mounted thread identity", () => {
  const { acknowledged, chat, received } = makeChat();

  receive(chat, fileThreadEvent({
    fileNid: "file-x",
    fileThreadId: "thread-x",
    messageId: "message-x",
  }));

  assert.equal(chat.fileThreadId, "thread-z");
  assert.equal(received.length, 0);
  assert.equal(acknowledged.length, 0);
});

test("the mounted file thread still receives its own realtime message once", () => {
  const { acknowledged, chat, received } = makeChat();

  receive(chat, fileThreadEvent({
    fileNid: "file-z",
    fileThreadId: "thread-z",
    messageId: "message-z",
  }));

  assert.equal(chat.fileThreadId, "thread-z");
  assert.deepEqual(received.map(({ message_id }) => message_id), ["message-z"]);
  assert.equal(acknowledged.length, 1);
});

test("a pending thread-info request adopts only the mounted file's thread", () => {
  const { chat, received } = makeChat({ fileThreadId: "" });

  receive(chat, fileThreadEvent({
    fileNid: "file-x",
    fileThreadId: "thread-x",
    messageId: "message-x",
  }));
  assert.equal(chat.fileThreadId, "");
  assert.equal(received.length, 0);

  receive(chat, fileThreadEvent({
    fileNid: "file-z",
    fileThreadId: "thread-z",
    messageId: "message-z",
  }));
  assert.equal(chat.fileThreadId, "thread-z");
  assert.deepEqual(received.map(({ message_id }) => message_id), ["message-z"]);
});

test("a file-thread child never appears in General chat", () => {
  const { acknowledged, chat, received } = makeChat({
    fileNid: "",
    fileThreadId: "",
  });

  receive(chat, fileThreadEvent({
    fileNid: "file-z",
    fileThreadId: "thread-z",
    messageId: "message-z",
  }));

  assert.equal(received.length, 0);
  assert.equal(acknowledged.length, 0);
});

test("Reply in thread keeps the General quote visual but omits its invalid parent id", () => {
  const chat = {
    threadId: "general-message-a",
    _replyInThread: true,
    isFileThreadMode: () => true,
  };

  assert.equal(getSendThreadId.call(chat), "");
});

test("a normal reply inside a file thread still sends its child parent id", () => {
  const chat = {
    threadId: "file-thread-child-b",
    _replyInThread: false,
    isFileThreadMode: () => true,
  };

  assert.equal(getSendThreadId.call(chat), "file-thread-child-b");
});

test("the first local file-thread post refreshes the owning folder", () => {
  const calls = [];
  const folder = {
    onFileThreadCreated(data) {
      calls.push(data);
    },
  };
  const chat = {
    getParentByKind(kind) {
      assert.equal(kind, "window_folder");
      return folder;
    },
  };
  const first = { file_thread: { is_new: 1 } };
  notifyFileThreadCreated.call(chat, first);
  notifyFileThreadCreated.call(chat, { file_thread: { is_new: 0 } });
  assert.deepEqual(calls, [first]);
});

test("folder refresh reloads General and the thread rail without resetting a file scope", async () => {
  const calls = [];
  const list = { restart: () => calls.push("general-restart") };
  const chat = {
    isFileThreadMode: () => false,
    ensurePart(name) {
      assert.equal(name, attrs.list);
      return Promise.resolve(list);
    },
  };
  const folder = {
    _populateThreadRail: () => calls.push("rail-refresh"),
    ensurePart(name) {
      assert.equal(name, "folder-chat");
      return Promise.resolve(chat);
    },
  };
  await onFileThreadCreated.call(folder);
  assert.deepEqual(calls, ["rail-refresh", "general-restart"]);

  calls.length = 0;
  chat.isFileThreadMode = () => true;
  await onFileThreadCreated.call(folder);
  assert.deepEqual(calls, ["rail-refresh"]);
});
