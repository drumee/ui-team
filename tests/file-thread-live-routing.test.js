const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const chatSource = readFileSync(
  join(__dirname, "../src/drumee/builtins/widget/chat/index.js"),
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

const matchesScopedChannel = compileMethod("matchesScopedChannel");
const onWsMessage = compileMethod("onWsMessage");

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
