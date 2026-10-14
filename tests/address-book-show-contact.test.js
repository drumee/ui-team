// address-book-show-contact.test.js — address_book.showContact(uid), what a
// Chat details member row opens through Desk.openContact: select the contact
// behind a drumate id, bringing a hidden one back into view.
//
//   node --test tests/address-book-show-contact.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

global.LetcBox = class {};
global._a = new Proxy({}, { get: (t, k) => k });
const en = require("../locale/en.json");
global.LOCALE = en;
String.prototype.format = function (...a) {
  return String(this).replace(/\{(\d+)\}/g, (_, i) => a[i]);
};
const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = { Box: { X: node("Box.X"), Y: node("Box.Y") }, Note: node("Note"), Image: { Svg: node("Image.Svg") } };
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

const contacts = [
  { id: "c1", entity: "u1", firstname: "Ann", is_drumate: 1 },
  { id: "c2", entity: "bob@x.io", drumate_id: "u2", firstname: "Bob", is_drumate: 1 },
  { id: "c3", entity: "u3", firstname: "Cy", is_drumate: 1, is_blocked: 1 },
];

function book({ tab = "all", option = "active", search = "", tagId = null } = {}) {
  const w = Object.create(AB.prototype);
  w.fig = { family: "address-book" };
  w._tab = tab;
  w._contactsOption = option;
  w._contacts = contacts.map((c) => ({ ...c }));
  w._invitations = [];
  w._sentInvitations = [];
  w._search = search;
  w._selectedTagId = tagId;
  w._selectedKey = null;
  w.calls = [];
  w.toasts = [];
  const input = { value: search };
  w.input = input;
  w.el = {
    dataset: { mview: "sidebar" },
    querySelector: (sel) => (sel.includes("__search-input") ? input : null),
    querySelectorAll: () => [],
  };
  w.whenItemsReady = () => Promise.resolve(true);
  w._refreshList = () => (w.calls.push("list"), Promise.resolve());
  w._selectContact = () => (w.calls.push(["detail", w._selectedKey]), Promise.resolve());
  w._showToast = (m, k) => w.toasts.push([m, k]);
  w._notFound = null;
  w.details = [];
  // The real _refreshDetail, against a fake "ab-detail" part.
  w.ensurePart = () => Promise.resolve({ feed: (t) => w.details.push(t) });
  w._renderInviteModal = () => (w.calls.push("invite"), Promise.resolve());
  w.switchTab = async (t) => {
    w.calls.push(["tab", t]);
    w._tab = t;
    w._contactsOption = "active";
    w._selectedKey = null;
  };
  return w;
}

test("selects the contact whose entity is the drumate id and shows its detail", async () => {
  const w = book();
  await w.showContact("u1");
  assert.equal(w._selectedKey, "c1");
  assert.equal(w.el.dataset.mview, "detail");
  assert.deepEqual(w.calls, ["list", ["detail", "c1"]]);
});

test("matches a contact saved by email through its drumate_id", async () => {
  const w = book();
  await w.showContact("u2");
  assert.equal(w._selectedKey, "c2");
});

test("a search that hides the contact is cleared, input included", async () => {
  const w = book({ search: "zzz" });
  await w.showContact("u1");
  assert.equal(w._search, "");
  assert.equal(w.input.value, "");
  assert.equal(w._selectedKey, "c1");
});

test("from the Archived tab it goes back to All first", async () => {
  const w = book({ tab: "archived", option: "archived" });
  w._contacts = [];
  w.switchTab = async (t) => {
    w.calls.push(["tab", t]);
    w._tab = t;
    w._contactsOption = "active";
    w._contacts = contacts.map((c) => ({ ...c }));
  };
  await w.showContact("u1");
  assert.deepEqual(w.calls[0], ["tab", "all"]);
  assert.equal(w._selectedKey, "c1");
});

const notes = (t) => [t, ...(t.kids || [])].filter((n) => n.type === "Note").map((n) => n.content);

test("someone not in the book: the not-found screen, named, in the detail pane", async () => {
  const w = book();
  w._selectedKey = "c1";
  await w.showContact("nobody", { name: "Zoe Lin", email: "zoe@x.io" });
  assert.equal(w._selectedKey, null);
  assert.deepEqual(w.toasts, []);
  assert.equal(w.el.dataset.mview, "detail");
  const screen = w.details.at(-1);
  assert.ok(screen.className.includes("__not-found-detail"));
  assert.ok(notes(screen).includes("Zoe Lin is not in your contacts"));
  assert.ok(notes(screen).includes(en.CONTACT_NOT_FOUND_HINT));
  const add = screen.kids.filter((n) => n.service === "add-not-found-contact");
  assert.equal(add.length, 1);
  assert.deepEqual(add[0].kids.map((k) => k.content || k.ico), ["ph-plus", "Add contact"]);
  assert.ok(add[0].kids.every((k) => k.active === undefined) && add[0].kidsOpt.active === 0);
});

test("without a name the not-found screen says so plainly", async () => {
  const w = book();
  await w.showContact("nobody");
  assert.ok(notes(w.details.at(-1)).includes(en.CONTACT_NOT_FOUND));
});

test("Add contact on the not-found screen opens the dialog with their email", async () => {
  const w = book();
  await w.showContact("nobody", { name: "Zoe", email: "zoe@x.io" });
  await w.onUiEvent({ get: () => "add-not-found-contact", mget: () => null }, {});
  assert.deepEqual(w._inviteDraft, { email: "zoe@x.io", message: "" });
  assert.ok(w.calls.includes("invite"));
});

test("picking a contact afterwards replaces the not-found screen", async () => {
  const w = book();
  await w.showContact("nobody", { name: "Zoe" });
  w._updateSelectionDom = () => {};
  await w.onUiEvent({ get: () => "select-contact", mget: () => "c1" }, {});
  assert.equal(w._notFound, null);
  assert.equal(w._selectedKey, "c1");
});

test("a tab switch drops the not-found screen", async () => {
  const w = book();
  await w.showContact("nobody");
  delete w.switchTab; // the real one
  w._refreshList = () => {};
  await w.switchTab("blocked");
  assert.equal(w._notFound, null);
  assert.ok(w.details.at(-1).className.includes("__empty-detail"));
  assert.ok(!w.details.at(-1).className.includes("__not-found-detail"));
});

test("a found contact clears an earlier not-found", async () => {
  const w = book();
  await w.showContact("nobody");
  await w.showContact("u1");
  assert.equal(w._notFound, null);
  assert.equal(w._selectedKey, "c1");
});

test("a contact past the built window grows it to include the row", async () => {
  const w = book();
  w._contacts = Array.from({ length: 130 }, (_, i) => ({ id: `k${i}`, entity: `v${i}`, is_drumate: 1 }));
  await w.showContact("v100");
  assert.equal(w._selectedKey, "k100");
  assert.equal(w.contactWindow(), 120);
});
