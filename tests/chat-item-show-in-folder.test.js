// chat-item-show-in-folder.test.js — "Show in folder" on a chat attachment card.
//
//   node --test tests/chat-item-show-in-folder.test.js
//
// The card is the message's sandbox copy, never the workspace file, so the
// click asks channel.attachment_location which file it stands for and lands
// the desk pane on THAT file's folder, highlighting it. Runs the real
// _showInFolder / _isPeerChat against stub widgets.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs
  .readFileSync(
    path.join(__dirname, "../src/drumee/builtins/widget/chat-item/index.js"),
    "utf8",
  )
  .replace(/\r\n/g, "\n");

const _ = {
  isString: (v) => typeof v === "string",
  isArray: Array.isArray,
  isFunction: (v) => typeof v === "function",
};
const _a = { nid: "nid", hub_id: "hub_id", uiHandler: "uiHandler" };

function load(Wm, LOCALE = { FILE_NOT_FOUND: "File not found" }) {
  const make = (sig) =>
    new Function(
      "_", "_a", "Wm", "LOCALE", "SERVICE",
      `return ${sliceFunction(SRC, sig)}`,
    )(_, _a, Wm, LOCALE, {});
  return {
    showInFolder: make("async _showInFolder(trigger)"),
    isPeerChat: make("_isPeerChat()"),
  };
}

function card(attrs, el) {
  return { el, model: {}, mget: (k) => attrs[k] };
}

function item({ cards, hub = "team", metadata, answer }) {
  const calls = [];
  return {
    calls,
    getItemsByKind: (k) => (k === "media_grid" ? cards : []),
    _chatHubId: () => hub,
    mget: (k) => (k === "metadata" ? metadata : undefined),
    fetchService: async (svc, args) => {
      calls.push({ svc, args });
      return answer;
    },
    warn() {},
  };
}

test("lands on the RESOLVED file's folder, not the card's", async () => {
  const opened = [];
  const order = [];
  const Wm = {
    clearReveal: () => order.push("clear"),
    openNotificationLocation: (a) => {
      order.push("open");
      opened.push(a);
    },
    alert() {},
  };
  const { showInFolder } = load(Wm);
  const link = {};
  const clicked = card(
    { nid: "copy", hub_id: "team", folder_nid: undefined },
    { contains: (t) => t === link },
  );
  const other = card({ nid: "other" }, { contains: () => false });
  const self = item({
    cards: [other, clicked],
    metadata: '{"_scope_nid":"root1"}',
    answer: { nid: "src", hub_id: "team", pid: "root1", filetype: "document" },
  });

  await showInFolder.call(self, link);

  assert.equal(self.calls[0].svc, "channel.attachment_location");
  const args = self.calls[0].args;
  assert.equal(args.hub_id, "team");
  assert.equal(args.attachment_nid, "copy");
  assert.equal(args.attachment_hub_id, "team");
  assert.equal(args.scope_nid, "root1");
  assert.equal(typeof args._ts, "number");
  assert.deepEqual(opened, [
    {
      hub_id: "team",
      nid: "src",
      pid: "root1",
      filetype: "document",
      activeTab: "files",
      highlight: 1,
    },
  ]);
  // The previous reveal's highlight goes first, so only this file is lit.
  assert.deepEqual(order, ["clear", "open"]);
});

test("nothing found → says so, opens nothing", async () => {
  const opened = [];
  const alerts = [];
  let cleared = 0;
  const Wm = {
    clearReveal: () => cleared++,
    openNotificationLocation: (a) => opened.push(a),
    alert: (m) => alerts.push(m),
  };
  const { showInFolder } = load(Wm);
  const link = {};
  const self = item({
    cards: [card({ nid: "copy", hub_id: "team" }, { contains: () => true })],
    answer: { status: "NOT_FOUND" },
  });
  await showInFolder.call(self, link);
  assert.deepEqual(opened, []);
  assert.deepEqual(alerts, ["File not found"]);
  // A failed lookup leaves the current highlight where it is.
  assert.equal(cleared, 0);
});

test("clearReveal un-lights every highlighted cell", () => {
  const WSRC = fs
    .readFileSync(path.join(__dirname, "../src/drumee/builtins/window/utils.js"), "utf8")
    .replace(/\r\n/g, "\n");
  const cells = [0, 1].map(() => {
    const attrs = { "data-ui-highlight": "1" };
    const classes = new Set(["media-highlight"]);
    return {
      attrs,
      classes,
      removeAttribute: (k) => delete attrs[k],
      classList: { remove: (c) => classes.delete(c) },
    };
  });
  const document = {
    querySelectorAll: (sel) => (sel === "[data-ui-highlight]" ? cells : []),
  };
  const clearReveal = new Function(
    "document",
    `return ${sliceFunction(WSRC, "clearReveal()")}`,
  )(document);
  clearReveal.call({});
  for (const c of cells) {
    assert.equal(c.attrs["data-ui-highlight"], undefined);
    assert.equal(c.classes.has("media-highlight"), false);
  }
});

test("p2p rows are peer chats; hub chats are not", () => {
  const { isPeerChat } = load({});
  const of = (uh) => isPeerChat.call({ mget: () => uh });
  assert.equal(of({ hubId: "h", peerId: "p" }), true);
  assert.equal(of([{ peerId: "p" }]), true);
  assert.equal(of({ hubId: "h", peerId: "" }), false);
  assert.equal(of(undefined), false);
});
