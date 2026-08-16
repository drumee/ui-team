#!/usr/bin/env node

/**
 * Standalone regression coverage for share-room eligibility in the chat
 * forward picker. Production class methods and skeleton factories are loaded
 * directly so the suite can run without a browser, UI bootstrap, or network.
 *
 * Run from ui-team with:
 *   node --test tests/chat-forward-picker-eligibility.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("fs");
const { dirname, join } = require("path");

const REPO_ROOT = join(__dirname, "..");
const PICKER_PATH = join(
  REPO_ROOT,
  "src/drumee/builtins/window/bigchat/widget/chat-item-forward/index.js"
);
const CONTENT_SKELETON_PATH = join(
  REPO_ROOT,
  "src/drumee/builtins/window/bigchat/widget/chat-item-forward/skeleton/content.js"
);
const SEARCH_SKELETON_PATH = join(
  REPO_ROOT,
  "src/drumee/builtins/window/bigchat/widget/chat-item-forward/skeleton/search.js"
);
const LIST_ITEM_PATH = join(
  REPO_ROOT,
  "src/drumee/builtins/window/bigchat/widget/chat-forward-list-item/index.js"
);
const LIST_ITEM_SKELETON_PATH = join(
  REPO_ROOT,
  "src/drumee/builtins/window/bigchat/widget/chat-forward-list-item/skeleton/index.js"
);

const PICKER_SOURCE = readFileSync(PICKER_PATH, "utf8");
const LIST_ITEM_SOURCE = readFileSync(LIST_ITEM_PATH, "utf8");

const Attr = {
  array: "array",
  closed: "closed",
  email: "email",
  firstname: "firstname",
  fullname: "fullname",
  id: "id",
  interactive: "interactive",
  lastname: "lastname",
  name: "name",
  online: "online",
  open: "open",
  peer_id: "peer_id",
  privateRoom: "privateRoom",
  search: "search",
  service: "service",
  shareRoom: "shareRoom",
  type: "type",
};

const Locale = {
  FORWARD: "Forward",
  FORWARD_DONE: "Forwarded",
  FORWARD_REJECTED: "Recipient rejected",
  NAME_CONTACT: "Contact",
  NO_CHAT_PERMISSION: "Chat is not allowed in this room",
  NO_CONTACT_FOUND: "No contact found",
  NOT_WORKSPACE_MEMBER: "Not a chat member of this workspace",
  NO_TEAMROOM_FOUND: "No team room found",
  OFFLINE: "Offline",
  ONLINE: "Online",
  SHARED_FOLDER_NAME: "Shared folder",
  TRY_AGAIN: "Try again",
};

const Services = {
  chat: {
    contact_rooms: "chat.contact_rooms",
    forward: "chat.forward",
    forward_eligibility: "chat.forward_eligibility",
    share_rooms: "chat.share_rooms",
  },
};

const Underscore = {
  isArray: Array.isArray,
  isEmpty(value) {
    if (value == null) return true;
    if (typeof value === "string" || Array.isArray(value)) {
      return value.length === 0;
    }
    if (typeof value === "object") return Object.keys(value).length === 0;
    return true;
  },
  isString: (value) => typeof value === "string",
};

const Visitor = {
  get: () => "visitor-hub",
};

function extractClassMethod(source, name) {
  const start = source.indexOf(`  ${name}(`);
  assert.notStrictEqual(start, -1, `${name} not found in production source`);

  // Methods in these classes close on a line indented exactly two spaces.
  // Nested blocks use deeper indentation, so this selects the class-method end.
  const end = source.indexOf("\n  }\n", start);
  assert.notStrictEqual(end, -1, `${name} has no closing brace`);

  const method = source.slice(start, end + 4).trim();
  assert.ok(method.startsWith(`${name}(`), `${name} signature changed`);
  return `function ${name}${method.slice(name.length)}`;
}

function compileClassMethods(source, names, dependencies) {
  const dependencyNames = Object.keys(dependencies);
  const dependencyValues = Object.values(dependencies);
  const compiled = {};

  for (const name of names) {
    const method = extractClassMethod(source, name);
    // The input is repository-owned production source, and dependencies are
    // narrow local shims for globals normally supplied by the UI bootstrap.
    // eslint-disable-next-line no-new-func
    const factory = new Function(...dependencyNames, `return (${method});`);
    compiled[name] = factory(...dependencyValues);
  }

  return compiled;
}

function loadCommonJsFactory(path, dependencies) {
  const source = readFileSync(path, "utf8");
  const dependencyNames = Object.keys(dependencies);
  const dependencyValues = Object.values(dependencies);
  const module = { exports: {} };
  const localRequire = (request) => {
    throw new Error(`unexpected require from skeleton: ${request}`);
  };

  // eslint-disable-next-line no-new-func
  const factory = new Function(
    ...dependencyNames,
    "module",
    "exports",
    "require",
    "__filename",
    "__dirname",
    `${source}\nreturn module.exports;`
  );

  return factory(
    ...dependencyValues,
    module,
    module.exports,
    localRequire,
    path,
    dirname(path)
  );
}

function createSkeletons() {
  const preserve = (config) => config;
  return {
    Box: { X: preserve, Y: preserve },
    Button: { Svg: preserve },
    Entry: preserve,
    List: { Smart: preserve },
    Note: preserve,
    UserProfile: preserve,
  };
}

function findSkeleton(root, predicate) {
  if (!root || typeof root !== "object") return null;
  if (predicate(root)) return root;
  if (!Array.isArray(root.kids)) return null;
  for (const kid of root.kids) {
    const match = findSkeleton(kid, predicate);
    if (match) return match;
  }
  return null;
}

function createTimerQueue() {
  const queue = [];
  let nextId = 1;

  return {
    queue,
    clearTimeout(id) {
      const index = queue.findIndex((task) => task.id === id);
      if (index >= 0) queue.splice(index, 1);
    },
    runNext() {
      assert.ok(queue.length, "expected a scheduled eligibility flush");
      return queue.shift().callback();
    },
    setTimeout(callback, delay) {
      assert.strictEqual(delay, 0);
      const task = { callback, id: nextId++ };
      queue.push(task);
      return task.id;
    },
  };
}

function createDeferred() {
  let reject;
  let resolve;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function makeRow(id) {
  let refreshes = 0;
  return {
    get refreshes() {
      return refreshes;
    },
    isDestroyed: () => false,
    mget: (key) => key === Attr.id ? id : undefined,
    refreshChatEligibility: () => {
      refreshes += 1;
    },
  };
}

function createPickerMethods({ timers, wm } = {}) {
  return compileClassMethods(
    PICKER_SOURCE,
    [
      "_sourceHubId",
      "_needsEligibility",
      "_registerShareRoom",
      "_flushShareEligibility",
      "_isShareRoomEligible",
      "filterData",
      "forwardMessage",
    ],
    {
      _: Underscore,
      _a: Attr,
      SERVICE: Services,
      Visitor,
      Wm: wm || { alert() {} },
      LOCALE: Locale,
      setTimeout: timers ? timers.setTimeout : setTimeout,
      clearTimeout: timers ? timers.clearTimeout : clearTimeout,
    }
  );
}

function makeBatchPicker({ postService, msgHubID = Visitor.get(Attr.id) }) {
  const timers = createTimerQueue();
  const methods = createPickerMethods({ timers });
  const picker = {
    _eligibilityInFlight: null,
    _eligibilityRows: new Map(),
    _eligibilityTimer: null,
    _msgHubID: msgHubID,
    _pendingEligibility: new Set(),
    _shareEligibility: Object.create(null),
    postService,
  };

  for (const [name, method] of Object.entries(methods)) {
    picker[name] = method.bind(picker);
  }
  return { picker, timers };
}

// `msgHubID` selects the rule under test. Passing the visitor's own ID models a
// P2P source (no workspace to confine to); any other value models a workspace
// conversation, where contacts are scored too.
function makeForwardPicker({
  contacts,
  eligibility,
  response,
  shares,
  msgHubID = Visitor.get(Attr.id),
}) {
  const alerts = [];
  const calls = [];
  const closes = [];
  const wm = { alert: (...args) => alerts.push(args) };
  const methods = createPickerMethods({ wm });
  const picker = {
    _msgHubID: msgHubID,
    _selectedShareRooms: [...shares],
    _seletecdContacts: [...contacts],
    _seletecdMessages: ["message-1"],
    _shareEligibility: { ...eligibility },
    closeOverlay: (cmd) => closes.push(cmd),
    mget: () => undefined,
    postService: (payload) => {
      calls.push(payload);
      return Promise.resolve(response);
    },
  };

  picker._sourceHubId = methods._sourceHubId.bind(picker);
  picker._needsEligibility = methods._needsEligibility.bind(picker);
  picker._isShareRoomEligible = methods._isShareRoomEligible.bind(picker);
  picker.filterData = methods.filterData.bind(picker);
  picker.forwardMessage = methods.forwardMessage.bind(picker);
  return { alerts, calls, closes, picker };
}

test("row IDs are deduplicated, capped at 50, and continued in a later batch", async () => {
  const ids = Array.from({ length: 51 }, (_, index) =>
    `hub-${String(index).padStart(2, "0")}`
  );
  const firstResponse = createDeferred();
  const calls = [];
  const { picker, timers } = makeBatchPicker({
    postService: (payload, options) => {
      calls.push({ options, payload });
      if (calls.length === 1) return firstResponse.promise;
      return Promise.resolve({ [ids[50]]: 1 });
    },
  });
  const rows = ids.map(makeRow);
  const duplicateRow = makeRow(ids[0]);

  for (const row of rows) picker._registerShareRoom(row);
  picker._registerShareRoom(duplicateRow);

  assert.equal(picker._pendingEligibility.size, 51);
  assert.equal(picker._eligibilityRows.get(ids[0]).size, 2);
  assert.equal(timers.queue.length, 1, "one page emits one initial flush");

  timers.runNext();
  const firstFlight = picker._eligibilityInFlight;
  assert.ok(firstFlight, "the first batch must be in flight");
  assert.equal(calls.length, 1);
  assert.equal(calls[0].payload.hub_ids.length, 50);
  assert.equal(new Set(calls[0].payload.hub_ids).size, 50);
  assert.equal(
    calls[0].payload.hub_ids.filter((id) => id === ids[0]).length,
    1,
    "duplicate rows must produce one hub lookup"
  );
  assert.deepEqual(calls[0].options, { async: 1 });
  assert.equal(picker._pendingEligibility.size, 1);
  assert.equal(timers.queue.length, 0, "the next batch waits for the first");

  const mapped = Object.fromEntries(ids.slice(0, 49).map((id) => [id, 1]));
  firstResponse.resolve(mapped);
  await firstFlight;

  assert.equal(picker._shareEligibility[ids[0]], 1);
  assert.equal(picker._shareEligibility[ids[49]], 0,
    "a missing response entry must fail closed");
  assert.equal(rows[0].refreshes, 1);
  assert.equal(duplicateRow.refreshes, 1,
    "every row sharing a deduplicated ID must refresh");
  assert.equal(rows[50].refreshes, 0);
  assert.equal(timers.queue.length, 1,
    "a remaining ID must schedule a later batch after settlement");

  timers.runNext();
  const secondFlight = picker._eligibilityInFlight;
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].payload.hub_ids, [ids[50]]);
  await secondFlight;

  assert.equal(picker._shareEligibility[ids[50]], 1);
  assert.equal(rows[50].refreshes, 1);
  assert.equal(picker._pendingEligibility.size, 0);
  assert.equal(timers.queue.length, 0);
});

test("an eligibility request failure maps every requested hub to zero", async () => {
  const calls = [];
  const { picker, timers } = makeBatchPicker({
    postService: (payload) => {
      calls.push(payload);
      return Promise.reject(new Error("eligibility unavailable"));
    },
  });
  const rows = [makeRow("hidden-hub"), makeRow("unavailable-hub")];

  for (const row of rows) picker._registerShareRoom(row);
  timers.runNext();
  await picker._eligibilityInFlight;

  assert.deepEqual(calls[0].hub_ids, ["hidden-hub", "unavailable-hub"]);
  assert.equal(picker._shareEligibility["hidden-hub"], 0);
  assert.equal(picker._shareEligibility["unavailable-hub"], 0);
  assert.deepEqual(rows.map((row) => row.refreshes), [1, 1]);
});

function makeSkeletonUi(msgHubID) {
  const methods = createPickerMethods({});
  const ui = {
    _msgHubID: msgHubID,
    _selectedShareRooms: [],
    _seletecdContacts: [],
    _shareEligibility: Object.create(null),
    fig: { family: "chat-item-forward" },
    getContactList() {},
    getRoomSearchApi() {},
    getShareRoomList() {},
    mget: (key) => key === Attr.type ? Attr.shareRoom : undefined,
  };
  ui._sourceHubId = methods._sourceHubId.bind(ui);
  ui._needsEligibility = methods._needsEligibility.bind(ui);
  return ui;
}

function makeSkeletonLists(ui) {
  const Skeletons = createSkeletons();
  const dependencies = {
    Skeletons,
    _a: Attr,
    _e: { search: "search" },
    LOCALE: Locale,
  };
  const contentSkeleton = loadCommonJsFactory(CONTENT_SKELETON_PATH, dependencies);
  const searchSkeleton = loadCommonJsFactory(SEARCH_SKELETON_PATH, dependencies);
  const smartList = (root) => findSkeleton(
    root,
    (node) => node.itemsOpt && node.itemsOpt.kind === "widget_chat_forward_list_item"
  );
  return {
    contactContent: smartList(contentSkeleton(ui, Attr.privateRoom)),
    shareContent: smartList(contentSkeleton(ui, Attr.shareRoom)),
    shareSearch: smartList(searchSkeleton(ui)),
  };
}

test("a P2P source gates share rooms only, leaving contacts selectable", () => {
  const ui = makeSkeletonUi(Visitor.get(Attr.id));
  const lists = makeSkeletonLists(ui);

  assert.equal(lists.shareContent.itemsOpt.shareEligibility, ui._shareEligibility);
  assert.equal(lists.shareContent.itemsOpt.eligibilityOwner, ui);
  assert.equal(lists.shareSearch.itemsOpt.shareEligibility, ui._shareEligibility);
  assert.equal(lists.shareSearch.itemsOpt.eligibilityOwner, ui);
  assert.ok(!Object.hasOwn(lists.contactContent.itemsOpt, "shareEligibility"));
  assert.ok(!Object.hasOwn(lists.contactContent.itemsOpt, "eligibilityOwner"));
});

test("a workspace source gates both tabs against that workspace", () => {
  // The confinement rule applies to people as much as to rooms, so the contact
  // tab has to be scored too — a contact outside the source workspace is not a
  // valid recipient there.
  const ui = makeSkeletonUi("source-hub");
  const lists = makeSkeletonLists(ui);

  for (const list of [lists.contactContent, lists.shareContent, lists.shareSearch]) {
    assert.equal(list.itemsOpt.shareEligibility, ui._shareEligibility);
    assert.equal(list.itemsOpt.eligibilityOwner, ui);
  }
});

test("final forwarding filters denied shares without filtering contacts", async () => {
  const { calls, picker } = makeForwardPicker({
    contacts: ["contact-kept"],
    eligibility: {
      "contact-kept": 0,
      "share-allowed": 1,
      "share-denied": 0,
    },
    response: { accepted: ["contact-kept", "share-allowed"] },
    shares: ["share-allowed", "share-denied", "share-unmapped"],
  });

  await picker.forwardMessage({ source: "button" });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].entities, ["contact-kept", "share-allowed"]);
  assert.deepEqual(picker._seletecdContacts, ["contact-kept"]);
  assert.deepEqual(picker._selectedShareRooms, ["share-allowed"]);
  assert.equal(calls[0].source_hub_id, undefined,
    "a P2P forward has no source workspace to confine to");
});

test("a workspace forward drops contacts outside that workspace", async () => {
  const { calls, picker } = makeForwardPicker({
    msgHubID: "source-hub",
    contacts: ["member-chat", "outsider"],
    eligibility: {
      "member-chat": 1,
      outsider: 0,
      "share-allowed": 1,
      "other-hub": 0,
    },
    response: { accepted: ["member-chat", "share-allowed"] },
    shares: ["share-allowed", "other-hub"],
  });

  await picker.forwardMessage({ source: "button" });

  assert.deepEqual(calls[0].entities, ["member-chat", "share-allowed"]);
  assert.deepEqual(picker._seletecdContacts, ["member-chat"]);
});

test("a workspace source scopes the eligibility request to that workspace", async () => {
  const calls = [];
  const { picker, timers } = makeBatchPicker({
    msgHubID: "source-hub",
    postService: (payload) => {
      calls.push(payload);
      return Promise.resolve({ recipient: 1 });
    },
  });

  picker._registerShareRoom(makeRow("recipient"));
  await timers.runNext();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].source_hub_id, "source-hub");
  assert.deepEqual(calls[0].hub_ids, ["recipient"]);
});

test("an unresolved row stays disabled until its verdict arrives", () => {
  const Skeletons = createSkeletons();
  const itemSkeleton = loadCommonJsFactory(LIST_ITEM_SKELETON_PATH, {
    Skeletons,
    _a: Attr,
    LOCALE: Locale,
  });
  const methods = compileClassMethods(
    LIST_ITEM_SOURCE,
    ["isChatDisabled", "disabledReason", "getPresenceText", "getUserState"],
    { _a: Attr, LOCALE: Locale }
  );
  // A contact row in a gated list, before the batched response lands.
  const values = {
    id: "member-chat",
    firstname: "Member",
    shareEligibility: {},
    type: Attr.privateRoom,
  };
  const row = {
    fig: { family: "chat-forward-list-item" },
    mget: (key) => values[key],
    selectedRoomList: [],
  };
  for (const [name, method] of Object.entries(methods)) {
    row[name] = method.bind(row);
  }

  const root = itemSkeleton(row);

  assert.equal(row.isChatDisabled(), true,
    "an unresolved verdict must not be selectable");
  // The reason names the actual rule: a person is refused for not being a
  // member, not for lacking a workspace chat right.
  assert.equal(row.disabledReason(), Locale.NOT_WORKSPACE_MEMBER);
  assert.deepEqual(root.dataset, { disabled: 1 });
});

test("no request is sent when final eligibility removes every selection", () => {
  const { alerts, calls, closes, picker } = makeForwardPicker({
    contacts: [],
    eligibility: { "share-denied": 0 },
    response: { accepted: [] },
    shares: ["share-denied", "share-unmapped"],
  });

  const result = picker.forwardMessage({ source: "button" });

  assert.equal(result, undefined);
  assert.equal(calls.length, 0);
  assert.equal(alerts.length, 0);
  assert.equal(closes.length, 0);
  assert.deepEqual(picker._selectedRooms, []);
});

test("an all-rejected response warns without closing the picker", async () => {
  const { alerts, calls, closes, picker } = makeForwardPicker({
    contacts: ["contact-rejected"],
    eligibility: {},
    response: {
      rejected: ["contact-rejected"],
      status: "INVALID_RECIPIENT",
    },
    shares: [],
  });
  const command = { source: "button" };

  await picker.forwardMessage(command);

  assert.equal(calls.length, 1);
  assert.equal(closes.length, 0);
  assert.deepEqual(alerts, [[Locale.FORWARD_REJECTED]]);
});

test("a source-message error warns without closing the picker", async () => {
  const { alerts, calls, closes, picker } = makeForwardPicker({
    contacts: ["contact-kept"],
    eligibility: {},
    response: { status: "INVALID_MESSAGES", rejected: [] },
    shares: [],
  });

  await picker.forwardMessage({ source: "button" });

  assert.equal(calls.length, 1);
  assert.equal(closes.length, 0);
  assert.deepEqual(alerts, [[Locale.TRY_AGAIN]]);
});

test("disabled share rows expose a reason and inert checkbox controls", () => {
  const Skeletons = createSkeletons();
  const itemSkeleton = loadCommonJsFactory(LIST_ITEM_SKELETON_PATH, {
    Skeletons,
    _a: Attr,
    LOCALE: Locale,
  });
  const methods = compileClassMethods(
    LIST_ITEM_SOURCE,
    ["isChatDisabled", "disabledReason", "getPresenceText", "getUserState"],
    { _a: Attr, LOCALE: Locale }
  );
  const values = {
    group_name: "Denied room",
    id: "share-denied",
    shareEligibility: {},
    type: Attr.shareRoom,
  };
  const row = {
    fig: { family: "chat-forward-list-item" },
    mget: (key) => values[key],
    selectedRoomList: ["share-denied"],
  };
  for (const [name, method] of Object.entries(methods)) {
    row[name] = method.bind(row);
  }

  const root = itemSkeleton(row);
  const checkbox = findSkeleton(root, (node) => node.sys_pn === "room-item-checkbox");

  assert.deepEqual(root.dataset, { disabled: 1 });
  // The className is what makes the reason visible: the framework only injects
  // the tooltip node, and every position/background rule lives in the skin
  // under this class. Without it the card renders unstyled and unreadable.
  assert.deepEqual(root.tooltips, {
    content: Locale.NO_CHAT_PERMISSION,
    className: "chat-forward-list-item__tooltip",
  });
  assert.deepEqual(root.uiHandler, []);
  assert.ok(checkbox, "the disabled row must still render its checkbox");
  assert.equal(checkbox.state, 0);
  assert.equal(checkbox.service, null);
  assert.deepEqual(checkbox.uiHandler, []);
});
