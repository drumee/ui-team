// Typing "@" in a WORKSPACE chat must offer the workspace's MEMBERS, not the
// visitor's personal contact list.
//
// This was fixed once (299e5604, May 2026) by pointing the contact mention at
// hub.get_members_by_type whenever the chat's scope was `folder` — at the time
// the only scope a folder chat ever had. 37ab4fcc (Aug 2026) then moved chat to
// WORKSPACE scope, so the team chat's scope became the string `workspace`, and
// the same commit updated `postNid` beside it but not the mention branch. The
// mention condition silently stopped matching and every workspace chat fell
// through to chat.contact_rooms — the visitor's own contacts again. Nothing
// threw, and the popup still opened, which is why it read as the old bug
// coming back rather than as a new one.
//
// The scope-source decision is one `if` inside a 300-line method that walks the
// DOM, so — as tests/workspace-delete-admin-only.js and tests/rail-logo-home.js
// do — the branch is cut out of the SOURCE FILE and run against a fake `this`.
// The test therefore reads the shipped text, not a copy of it.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const CHAT = resolve(__dirname, "../src/drumee/builtins/widget/chat/index.js");
const src = readFileSync(CHAT, "utf8");

// ── cut the two pieces out of the source ────────────────────────────────────

const HELPER = /^const isHubScopedChat = .*$/m;
const helperSrc = src.match(HELPER);
assert.ok(helperSrc, "isHubScopedChat vanished from the chat widget");

/** Slice from `start` to the brace that closes the block opened on that line. */
function block(text, start) {
  let depth = 0;
  for (let i = start; i < text.length; i++) {
    if (text[i] === "{") depth++;
    else if (text[i] === "}" && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error("unbalanced braces");
}

const BRANCH = 'if (mentionType === "contact") {';
const branchAt = src.indexOf(BRANCH);
assert.notEqual(branchAt, -1, "the contact-mention branch was renamed or removed");
const branchSrc = block(src, branchAt);

// The branch reads `filter`, `folderHubId` and `mentionType` from the enclosing
// method and assigns `contactsPromise`; everything else it touches is either a
// runtime global (passed in) or on `this` (the fake below).
const runBranch = new Function(
  "_a",
  "Visitor",
  "SERVICE",
  "console",
  "mentionType",
  "filter",
  "folderHubId",
  `
  ${helperSrc[0]}
  let contactsPromise = null;
  ${branchSrc}
  return contactsPromise;
  `,
);

// ── the runtime the branch expects ──────────────────────────────────────────

const _a = { folder: "folder", id: "id" };
const SERVICE = {
  hub: { get_members_by_type: "hub.get_members_by_type" },
  chat: { contact_rooms: "chat.contact_rooms" },
};
const quiet = { log() {}, warn() {} };

const VISITOR_ID = "visitor-personal-hub";
const Visitor = {
  id: VISITOR_ID,
  get: (k) => (k === "id" ? VISITOR_ID : undefined),
};

/** Run the branch for one chat and report which service it asked for. */
function sourceFor(scope, hubId, { visitor = Visitor } = {}) {
  let asked = null;
  const chat = {
    hubId,
    mget: (k) => (k === "scope" ? scope : undefined),
    fetchService(payload) {
      asked = payload;
      return Promise.resolve([]);
    },
  };
  runBranch.call(chat, _a, visitor, SERVICE, quiet, "contact", "", hubId);
  assert.ok(asked, "the contact branch asked for nothing at all");
  return asked;
}

const HUB = "workspace-hub-42";

// ── the bug ─────────────────────────────────────────────────────────────────

test("a workspace chat offers the WORKSPACE MEMBERS", () => {
  const asked = sourceFor("workspace", HUB);
  assert.equal(
    asked.service,
    SERVICE.hub.get_members_by_type,
    "THE BUG: the workspace team chat is back on the visitor's contact rooms",
  );
  assert.equal(asked.hub_id, HUB, "the members must come from THIS workspace");
  assert.equal(asked.type, "all");
});

test("a DMZ share's folder chat keeps the members it already had", () => {
  // The scope that 299e5604 fixed. Widening the test must not narrow this one.
  const asked = sourceFor("folder", HUB);
  assert.equal(asked.service, SERVICE.hub.get_members_by_type);
  assert.equal(asked.hub_id, HUB);
});

// ── what must NOT change ────────────────────────────────────────────────────

test("bigchat / a direct room still offers the visitor's contact rooms", () => {
  // No scope at all: the conversation belongs to the visitor, not to a hub.
  const asked = sourceFor(undefined, VISITOR_ID);
  assert.equal(asked.service, SERVICE.chat.contact_rooms);
  assert.equal(asked.hub_id, VISITOR_ID);
});

test("a PERSONAL workspace still offers contact rooms, not an empty list", () => {
  // A personal workspace IS the user, so its hub_id is Visitor.id and the
  // server answers [] for it (hub._members_by_type). Sending it down the
  // members path would have traded the old wrong list for no list at all.
  const asked = sourceFor("workspace", VISITOR_ID);
  assert.equal(
    asked.service,
    SERVICE.chat.contact_rooms,
    "a personal workspace has no members — it must not lose its suggestions",
  );
});

test("a workspace chat with no hub id falls back rather than asking for none", () => {
  const asked = sourceFor("workspace", "");
  assert.equal(asked.service, SERVICE.chat.contact_rooms);
});

test("an unknown Visitor id does not make every hub look personal", () => {
  // Visitor.id can be undefined before the session lands. `${hub}` === `${undefined}`
  // is false anyway, but the guard says so explicitly — assert it, because a
  // truthiness slip here would silently send real workspaces to contact rooms.
  const blind = { id: undefined, get: () => undefined };
  const asked = sourceFor("workspace", HUB, { visitor: blind });
  assert.equal(asked.service, SERVICE.hub.get_members_by_type);
});

// ── the predicate itself ────────────────────────────────────────────────────

test("isHubScopedChat is the single list of hub-owned scopes", () => {
  const isHubScopedChat = new Function(
    "_a",
    `${helperSrc[0]}; return isHubScopedChat;`,
  )(_a);

  assert.equal(isHubScopedChat("workspace"), true);
  assert.equal(isHubScopedChat("folder"), true);
  assert.equal(isHubScopedChat(undefined), false);
  assert.equal(isHubScopedChat(""), false);
  assert.equal(isHubScopedChat("personal"), false);

  // Every scope test that means "this conversation belongs to a hub" goes
  // through the predicate. Keeping them apart is what broke the mention list.
  const inline = src
    .replace(HELPER, "") // the predicate's own definition is the one allowed copy
    .match(/scope\s*===\s*_a\.folder\s*\|\|\s*scope\s*===\s*"workspace"/g);
  assert.equal(
    inline,
    null,
    "a scope list was inlined again instead of using isHubScopedChat",
  );
});
