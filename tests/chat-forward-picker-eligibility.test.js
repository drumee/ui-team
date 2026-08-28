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
  entity_id: "entity_id",
  firstname: "firstname",
  fullname: "fullname",
  id: "id",
  interactive: "interactive",
  itemsOpt: "itemsOpt",
  lastname: "lastname",
  name: "name",
  online: "online",
  open: "open",
  peer_id: "peer_id",
  all: "all",
  drumate_id: "drumate_id",
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
  hub: {
    get_members_by_type: "hub.get_members_by_type",
  },
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
      "_usesWorkspaceMembers",
      "_svcPayload",
      "getContactList",
      "getRoomSearchApi",
      "memberSearchRows",
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
  picker._svcPayload = methods._svcPayload.bind(picker);
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

function makeSkeletonUi(msgHubID, { members = null, search = "" } = {}) {
  const methods = createPickerMethods({});
  const values = { [Attr.type]: Attr.shareRoom, [Attr.search]: search };
  const ui = {
    _msgHubID: msgHubID,
    _selectedShareRooms: [],
    _seletecdContacts: [],
    _shareEligibility: Object.create(null),
    _workspaceMembers: members,
    fig: { family: "chat-item-forward" },
    getShareRoomList() {},
    mget: (key) => values[key],
  };
  for (const name of [
    "_sourceHubId",
    "_needsEligibility",
    "_usesWorkspaceMembers",
    "getContactList",
    "getRoomSearchApi",
    "memberSearchRows",
  ]) {
    ui[name] = methods[name].bind(ui);
  }
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

function makePickerListPart(type) {
  const listeners = new Map();
  return {
    emit(event, rows) {
      for (const listener of listeners.get(event) || []) listener(rows);
    },
    listenerCount(event) {
      return (listeners.get(event) || []).length;
    },
    mget(key) {
      return key === Attr.itemsOpt ? { [Attr.type]: type } : undefined;
    },
    on(event, listener) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(listener);
    },
  };
}

function makeWorkspaceMemberCachePicker({
  msgHubID = "source-hub",
  search = "",
  searchResult = null,
  searchSkeleton = () => ({}),
  type,
} = {}) {
  const methods = compileClassMethods(
    PICKER_SOURCE,
    [
      "onPartReady",
      "_sourceHubId",
      "_usesWorkspaceMembers",
      "_workspaceMemberId",
      "_cacheWorkspaceMembers",
      "_cacheEmptyWorkspaceMembers",
      "_refreshWorkspaceMemberSearch",
    ],
    {
      _: Underscore,
      _a: Attr,
      _e: { data: "data", eod: "eod" },
      WORKSPACE_MEMBER_ID_RE: /^[0-9a-zA-Z_-]{1,32}$/,
      Visitor,
      require(request) {
        assert.equal(request, "./skeleton/search");
        return searchSkeleton;
      },
    }
  );
  const picker = {
    _msgHubID: msgHubID,
    _workspaceMembers: null,
    debug() {},
    getPart: (pn) => pn === "search-result" ? searchResult : undefined,
    mget: (key) => ({ [Attr.search]: search, [Attr.type]: type })[key],
  };
  for (const [name, method] of Object.entries(methods)) {
    picker[name] = method.bind(picker);
  }
  return picker;
}

test("only the workspace-member SmartList can populate the member cache", () => {
  for (const eventOrder of ["member-first", "share-first"]) {
    const picker = makeWorkspaceMemberCachePicker();
    const memberList = makePickerListPart(Attr.privateRoom);
    const shareList = makePickerListPart(Attr.shareRoom);
    const memberRows = [{ id: `member-${eventOrder}` }];
    const shareRows = [{ id: `share-${eventOrder}` }];

    picker.onPartReady(memberList, "forward-room-list");
    picker.onPartReady(shareList, "forward-room-list");

    const emissions = eventOrder === "member-first"
      ? [[memberList, memberRows], [shareList, shareRows]]
      : [[shareList, shareRows], [memberList, memberRows]];
    for (const [list, rows] of emissions) list.emit("data", rows);

    assert.strictEqual(picker._workspaceMembers, memberRows,
      `share-room data must not win when emitted ${eventOrder}`);
    assert.equal(memberList.listenerCount("data"), 1);
    assert.equal(shareList.listenerCount("data"), 0);
  }

  const p2pPicker = makeWorkspaceMemberCachePicker({
    msgHubID: Visitor.get(Attr.id),
  });
  const p2pContactList = makePickerListPart(Attr.privateRoom);
  const p2pShareList = makePickerListPart(Attr.shareRoom);
  p2pPicker.onPartReady(p2pContactList, "forward-room-list");
  p2pPicker.onPartReady(p2pShareList, "forward-room-list");
  assert.equal(p2pContactList.listenerCount("data"), 0);
  assert.equal(p2pShareList.listenerCount("data"), 0);
});

test("an empty member-list eod caches an empty result without erasing data", () => {
  const emptyPicker = makeWorkspaceMemberCachePicker();
  const emptyMemberList = makePickerListPart(Attr.privateRoom);
  emptyPicker.onPartReady(emptyMemberList, "forward-room-list");
  emptyMemberList.emit("eod");
  assert.deepEqual(emptyPicker._workspaceMembers, []);

  const populatedPicker = makeWorkspaceMemberCachePicker();
  const populatedMemberList = makePickerListPart(Attr.privateRoom);
  const memberRows = [{ id: "member-kept" }];
  populatedPicker.onPartReady(populatedMemberList, "forward-room-list");
  populatedMemberList.emit("data", memberRows);
  populatedMemberList.emit("eod");
  assert.strictEqual(populatedPicker._workspaceMembers, memberRows,
    "eod after a short nonempty page must preserve its cached rows");
});

test("workspace member rows normalize in place and reject unsafe identities", () => {
  const picker = makeWorkspaceMemberCachePicker();
  const memberList = makePickerListPart(Attr.privateRoom);
  const conflictingAliases = {
    entity_id: "entity-conflict",
    drumate_id: "drumate-conflict",
  };
  const conflictingLegacyId = {
    entity_id: "entity-conflict",
    id: "legacy-conflict",
  };
  const conflictingDrumateLegacy = {
    drumate_id: "drumate-conflict",
    id: "legacy-conflict",
  };
  const threeWayConflict = {
    entity_id: "entity-conflict",
    drumate_id: "drumate-conflict",
    id: "legacy-conflict",
  };
  const invalidPopulatedAlias = {
    entity_id: { unsafe: true },
    drumate_id: "otherwise-valid",
  };
  const malformedString = { entity_id: "bad id" };
  const noValidIdentity = { entity_id: "  ", drumate_id: 42, id: null };
  const contactOnly = { contact_id: "contact-only" };
  const rows = [
    { entity_id: "entity-only" },
    { drumate_id: "drumate-only" },
    {
      entity_id: "same-id",
      drumate_id: " same-id ",
      id: "same-id",
    },
    { id: "existing-id" },
    { entity_id: "  ", drumate_id: " trimmed-drumate " },
    conflictingAliases,
    conflictingLegacyId,
    conflictingDrumateLegacy,
    threeWayConflict,
    invalidPopulatedAlias,
    malformedString,
    noValidIdentity,
    contactOnly,
  ];

  picker.onPartReady(memberList, "forward-room-list");
  memberList.emit("data", rows);

  assert.deepEqual(rows.map((row) => row.id), [
    "entity-only",
    "drumate-only",
    "same-id",
    "existing-id",
    "trimmed-drumate",
  ]);
  assert.strictEqual(picker._workspaceMembers, rows,
    "the rows normalized for rendering must also back local search");
  for (const rejected of [
    conflictingAliases,
    conflictingLegacyId,
    conflictingDrumateLegacy,
    threeWayConflict,
    invalidPopulatedAlias,
    malformedString,
    noValidIdentity,
    contactOnly,
  ]) {
    assert.equal(rows.includes(rejected), false,
      "conflicting or invalid identities must be removed before rendering");
  }
});

test("member cache arrival rebuilds an active workspace search", () => {
  const fed = [];
  const rendered = { rendered: "filtered-member-search" };
  const picker = makeWorkspaceMemberCachePicker({
    search: "anh",
    searchResult: {
      el: { dataset: { mode: Attr.open } },
      feed: (skeleton) => fed.push(skeleton),
    },
    searchSkeleton: () => rendered,
    type: Attr.privateRoom,
  });
  const memberList = makePickerListPart(Attr.privateRoom);

  picker.onPartReady(memberList, "forward-room-list");
  memberList.emit("data", [{ entity_id: "member-anh" }]);

  assert.deepEqual(picker._workspaceMembers.map((row) => row.id), ["member-anh"]);
  assert.deepEqual(fed, [rendered]);
});

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
    ["isChatDisabled", "eligibilityMap", "disabledReason", "getPresenceText", "getUserState"],
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
    ["isChatDisabled", "eligibilityMap", "disabledReason", "getPresenceText", "getUserState"],
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

test("a workspace forward lists that workspace's members, not the contact book", () => {
  // The bug this locks: joining a workspace creates no contact
  // (drumate/hubs/join_hub.sql files the hub as a media node and nothing else),
  // so sourcing the people tab from chat.contact_rooms listed colleagues the
  // server would accept only by coincidence — usually none of them.
  const workspace = makeSkeletonUi("source-hub");
  assert.deepEqual(workspace.getContactList(), {
    service: Services.hub.get_members_by_type,
    hub_id: "source-hub",
    type: Attr.all,
  });

  // A P2P chat belongs to no workspace and keeps the contact book.
  const p2p = makeSkeletonUi(Visitor.get(Attr.id));
  assert.equal(p2p.getContactList().service, Services.chat.contact_rooms);
});

test("the member list is pinned to one page and never re-fetched", () => {
  // hub_get_members_by_type returns every member at once — its LIMIT is
  // commented out — so a second page would repeat the same rows and the picker
  // would show each member twice.
  const workspace = makeSkeletonLists(makeSkeletonUi("source-hub"));
  assert.equal(workspace.contactContent.max_page, 1);
  assert.equal(workspace.shareContent.max_page, undefined);

  const p2p = makeSkeletonLists(makeSkeletonUi(Visitor.get(Attr.id)));
  assert.equal(p2p.contactContent.max_page, undefined);
});

test("member search filters the loaded rows on name and email", () => {
  const members = [
    { id: "a", firstname: "Anh", lastname: "Tran", email: "anh@example.com" },
    { id: "b", firstname: "Bao", lastname: "Le", email: "bao@example.com" },
    { id: "c", firstname: "Chi", lastname: "Nguyen", email: "anh.chi@corp.io" },
  ];

  // hub_get_members_by_type accepts no search key, so an unfiltered search
  // would list every member however specific the query.
  const byName = makeSkeletonUi("source-hub", { members, search: "bao" });
  assert.deepEqual(byName.memberSearchRows().map((r) => r.id), ["b"]);

  // Email counts because the row displays it — matching only names would hide
  // a result the user can plainly see.
  const byEmail = makeSkeletonUi("source-hub", { members, search: "anh" });
  assert.deepEqual(byEmail.memberSearchRows().map((r) => r.id), ["a", "c"]);

  const noMatch = makeSkeletonUi("source-hub", { members, search: "zzz" });
  assert.deepEqual(noMatch.memberSearchRows(), []);

  // Nothing cached yet -> null, so the search skeleton can fail closed with
  // safe empty kids until the member list publishes its cache.
  assert.equal(makeSkeletonUi("source-hub").memberSearchRows(), null);
});

test("workspace member search stays empty until its cache is ready", () => {
  const ui = makeSkeletonUi("source-hub", { search: "anh" });
  ui.mget = (key) => ({ [Attr.type]: Attr.privateRoom, [Attr.search]: "anh" })[key];

  const Skeletons = createSkeletons();
  const searchSkeleton = loadCommonJsFactory(SEARCH_SKELETON_PATH, {
    Skeletons,
    _a: Attr,
    _e: { search: "search" },
    LOCALE: Locale,
  });
  const list = findSkeleton(
    searchSkeleton(ui),
    (node) => node.sys_pn === "forward-search-list"
  );

  assert.deepEqual(list.kids, [],
    "a pending member cache must render no unfiltered recipients");
  assert.equal(list.api, undefined,
    "hub.get_members_by_type cannot safely serve a search query");
  assert.equal(list.itemsOpt, undefined,
    "static kids must not enter SmartList's kids-plus-itemsOpt corruption path");

  const p2p = makeSkeletonUi(Visitor.get(Attr.id), { search: "anh" });
  p2p.mget = (key) => ({ [Attr.type]: Attr.privateRoom, [Attr.search]: "anh" })[key];
  const p2pList = findSkeleton(
    searchSkeleton(p2p),
    (node) => node.sys_pn === "forward-search-list"
  );
  assert.equal(p2pList.api, p2p.getRoomSearchApi,
    "P2P contact search must keep its server API");
  assert.equal(p2pList.itemsOpt.kind, "widget_chat_forward_list_item");
  assert.equal(p2pList.kids, undefined);
});

test("the member search renders cached rows without a second request", () => {
  const members = [
    { id: "a", firstname: "Anh", lastname: "Tran", email: "anh@example.com" },
  ];
  const ui = makeSkeletonUi("source-hub", { members, search: "anh" });
  // The people tab is the one under search here, not the default share tab.
  ui.mget = (key) => ({ [Attr.type]: Attr.privateRoom, [Attr.search]: "anh" })[key];

  const Skeletons = createSkeletons();
  const searchSkeleton = loadCommonJsFactory(SEARCH_SKELETON_PATH, {
    Skeletons,
    _a: Attr,
    _e: { search: "search" },
    LOCALE: Locale,
  });
  const list = findSkeleton(
    searchSkeleton(ui),
    (node) => node.sys_pn === "forward-search-list"
  );

  assert.deepEqual(list.kids.map((row) => row.id), ["a"]);
  assert.equal(list.kids[0].kind, "widget_chat_forward_list_item");
  assert.equal(list.kids[0].type, Attr.privateRoom);
  assert.equal(list.kids[0].eligibilityOwner, ui);
  assert.equal(list.kids[0].shareEligibility, ui._shareEligibility);
  assert.equal(list.api, undefined, "cached rows must not trigger a fetch");
  assert.equal(list.itemsOpt, undefined,
    "prepared static rows must not be reshaped by List.initialize");
});

test("an async acknowledgement envelope still scores the rows it carries", async () => {
  // Observed live on stage: chat.forward_eligibility answered with the map
  // nested inside {__ack__, __status__, data:{...}} rather than at the top
  // level, and every row stayed disabled — indexing the envelope yields
  // undefined for each recipient, which fail-closes to 0.
  const { picker, timers } = makeBatchPicker({
    msgHubID: "source-hub",
    postService: () => Promise.resolve({
      __ack__: "chat.forward_eligibility",
      __status__: "online",
      __timestamp__: 1786793193099,
      data: { "4222452f42224533": 1, "97b24b3d97b24b42": 1 },
    }),
  });

  const rows = [makeRow("4222452f42224533"), makeRow("97b24b3d97b24b42")];
  for (const row of rows) picker._registerShareRoom(row);
  await timers.runNext();

  assert.equal(picker._isShareRoomEligible("4222452f42224533"), true);
  assert.equal(picker._isShareRoomEligible("97b24b3d97b24b42"), true);
  assert.ok(rows.every((row) => row.refreshes === 1),
    "each row must re-render once its verdict lands");

  // A real eligibility map carries no __ack__ and must pass through as-is.
  assert.deepEqual(picker._svcPayload({ a: 1, b: 0 }), { a: 1, b: 0 });
});

test("a row reads the owner's live verdict, not its own model snapshot", () => {
  // The bug this locks, reproduced on stage: `shareEligibility` is handed to the
  // row through itemsOpt, so it lands in a Backbone model — which COPIES the
  // attributes it is given. The row kept the empty object captured before any
  // response arrived while the picker went on filling its own map, so every
  // recipient read "no verdict" and stayed disabled even though the server had
  // answered 1 for each of them.
  const methods = compileClassMethods(
    LIST_ITEM_SOURCE,
    ["isChatDisabled", "eligibilityMap"],
    { _a: Attr, LOCALE: Locale }
  );

  const owner = { _shareEligibility: { "member-chat": 1, "member-view": 0 } };
  // The snapshot the model holds: empty, exactly as it was at render time.
  const values = { id: "member-chat", shareEligibility: {}, eligibilityOwner: owner };
  const row = { mget: (key) => values[key] };
  for (const [name, fn] of Object.entries(methods)) row[name] = fn.bind(row);

  assert.equal(row.isChatDisabled(), false, "an allowed recipient must be selectable");

  values.id = "member-view";
  assert.equal(row.isChatDisabled(), true, "a refused recipient stays disabled");

  // Ungated tab (no map passed at all) stays selectable — the model value is
  // still what decides WHETHER the row is gated.
  const ungated = { mget: (key) => ({ id: "anyone" })[key] };
  for (const [name, fn] of Object.entries(methods)) ungated[name] = fn.bind(ungated);
  assert.equal(ungated.isChatDisabled(), false);

  // No owner reachable (defensive): fall back to the model's own copy.
  const orphanValues = { id: "x", shareEligibility: { x: 1 } };
  const orphan = { mget: (key) => orphanValues[key] };
  for (const [name, fn] of Object.entries(methods)) orphan[name] = fn.bind(orphan);
  assert.equal(orphan.isChatDisabled(), false);
});
