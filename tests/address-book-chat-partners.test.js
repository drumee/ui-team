// address-book-chat-partners.test.js — someone you have messaged or called
// shows in Contacts even when never saved (my_contact_show_next branch 3,
// status 'nocontact'), gets only the actions that work without a contact row,
// and the list refreshes when Contacts is reopened or a new conversation
// starts while it is on screen.
//
//   node --test tests/address-book-chat-partners.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");

global.LetcBox = class {};
global._a = new Proxy({}, { get: (t, k) => k });
global.LOCALE = require("../locale/en.json");
global.SERVICE = {
  chat: { post: "chat.post" },
  contact: { show_contact: "contact.show_contact", invite_get: "contact.invite_get", load: "contact.load" },
};
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = {
  Box: { X: node("Box.X"), Y: node("Box.Y") },
  Note: node("Note"),
  Image: { Svg: node("Image.Svg") },
  UserProfile: node("UserProfile"),
};
global._K = { tag: { a: "a" } };
global.Visitor = { id: "me0000000000000a" };
const _load = Module._load;
Module._load = function (r, ...a) {
  if (r === "./skin") return {};
  if (r === "libs/desk-canvas") return { trackDeskCanvas: () => () => {} };
  if (r === "libs/items-ready") return { armItemsReady: () => {}, markItemsReady: () => {} };
  if (r === "libs/p2p-call") return { startP2PCall: () => {} };
  return _load.call(this, r, ...a);
};
const AB = require("../src/drumee/builtins/widget/address-book");
const detail = require("../src/drumee/builtins/widget/address-book/skeleton/contact-detail");

const partner = { id: "p1", entity: "p1", firstname: "Pat", email: "pat@x.io", is_drumate: 1, status: "nocontact" };

function book(rows) {
  const w = Object.create(AB.prototype);
  w.fig = { family: "address-book" };
  w._contacts = [];
  w._invitations = [];
  w._sentInvitations = [];
  w._contactsOption = "active";
  w._editing = false;
  w.el = { dataset: { anim: "in" } };
  w.isDestroyed = () => false;
  w.fetches = [];
  w.fetchService = async (o) => {
    w.fetches.push(o.option || o.service);
    if (o.service === SERVICE.contact.show_contact && o.option !== "sent") return rows;
    return [];
  };
  w.painted = [];
  w._refreshList = async () => w.painted.push("list");
  w._refreshDetail = async () => w.painted.push("detail");
  w._updateSelectionDom = () => {};
  return w;
}
const settle = () => new Promise((r) => setTimeout(r, 0));

test("a chat partner is listed", async () => {
  const w = book([{ id: "c1", entity: "u1", firstname: "Ann", is_drumate: 1 }, partner]);
  await w._loadContacts("active");
  assert.deepEqual(w._contacts.map((c) => c.id), ["c1", "p1"]);
});

test("a single row (collapsed to an object) is still listed", async () => {
  const w = book(partner);
  await w._loadContacts("active");
  assert.deepEqual(w._contacts.map((c) => c.id), ["p1"]);
});

test("a partner already saved by email is not listed twice", async () => {
  const saved = { id: "c2", entity: "pat@x.io", drumate_id: "p1", is_drumate: 1, firstname: "Pat" };
  const w = book([saved, partner]);
  await w._loadContacts("active");
  assert.deepEqual(w._contacts.map((c) => c.id), ["c2"]);
});

test("reopening Contacts re-reads the book and keeps an open edit form", async () => {
  const w = book([partner]);
  w._editing = true;
  w.onPanelShown();
  await settle();
  await settle();
  assert.ok(w.fetches.includes("active"));
  assert.deepEqual(w.painted, ["list"]);
});

test("reopening with nothing changed repaints nothing (scroll kept)", async () => {
  const w = book([partner]);
  await w._loadContacts("active");
  w.onPanelShown();
  await settle();
  await settle();
  assert.deepEqual(w.painted, []);
});

test("a message from someone not listed re-reads a visible list", async () => {
  const w = book([partner]);
  let delay = null;
  w._reloadContacts = (d) => { delay = d; };
  w._contacts = [{ id: "c1", entity: "u1", is_drumate: 1 }];
  w.onWsMessage("live", { peer_id: "p1", entity_id: Visitor.id }, { service: "chat.post" });
  assert.equal(delay, 500);
});

test("known peers, own echoes and a hidden panel do not reload", () => {
  const w = book([]);
  let reloads = 0;
  w._reloadContacts = () => reloads++;
  w._contacts = [{ id: "c1", entity: "u1", is_drumate: 1 }];
  w._invitations = [{ id: "i1", uid: "u9" }];
  w.onWsMessage("live", { peer_id: "u1", entity_id: Visitor.id }, { service: "chat.post" });
  w.onWsMessage("live", { peer_id: "u9" }, { service: "chat.post" });
  w.onWsMessage("live", { author_id: Visitor.id }, { service: "chat.post" });
  w.el.dataset.anim = "out";
  w.onWsMessage("live", { peer_id: "p1" }, { service: "chat.post" });
  assert.equal(reloads, 0);
});

test("a chat partner's detail offers only Inbox, Call and Add contact", () => {
  const ui = {
    fig: { family: "address-book" },
    isEditing: () => false,
    getEditError: () => null,
  };
  const tree = JSON.stringify(detail(ui, { ...partner }));
  for (const s of ["contact-inbox", "contact-call", "add-partner-contact"]) {
    assert.ok(tree.includes(`"${s}"`), s);
  }
  for (const s of ["edit-contact", "delete-contact", "block-contact", "archive-contact"]) {
    assert.ok(!tree.includes(`"${s}"`), s);
  }
  assert.ok(tree.includes('"contactEmail":"pat@x.io"'));
});

test("a chat partner has no contact row to hydrate or edit", async () => {
  const w = book([]);
  w._contacts = [{ ...partner }];
  w._selectedKey = "p1";
  w._invitations = [];
  w._sentInvitations = [];
  await w._selectContact();
  assert.ok(!w.fetches.includes(undefined));
  assert.equal(w.fetches.length, 0);
});

// The proc lives in the sibling schemas repo. Read the pushed version
// (origin/test) rather than the working tree, which may be behind; skip when
// that repo is not checked out next to this one.
function pushedProc() {
  try {
    return require("node:child_process").execFileSync(
      "git",
      ["-C", path.join(__dirname, "../../schemas"), "show",
        "origin/test:drumate/procedures/contact/my_contact_show_next.sql"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    );
  } catch (e) {
    return null;
  }
}

test("my_contact_show_next lists chat partners (branch 3)", (t) => {
  const sql = pushedProc();
  if (!sql) return t.skip("schemas repo not available");
  const b3 = sql.slice(sql.indexOf("-- 3. People you have messaged"));
  assert.match(b3, /FROM p2p_time tc/);
  assert.match(b3, /'nocontact' as status/);
  assert.match(b3, /NOT IN \(SELECT IFNULL\(uid, '1'\) FROM contact\)/);
  assert.match(b3, /NOT \(_domain_id > 1 AND d\.domain_id = _domain_id\)/);
});
