// Reading a notification must not delete it — Lexis, 2026-08-28.
//
// Until now a body click and the trash button were the SAME operation: both
// fired 'dismiss-activity', both persisted a dismissal and both ripped the row
// out of the DOM. So opening a notification destroyed it. The split is:
//
//   body click   → 'read-activity'    marks read, row STAYS, tint drops
//   trash button → 'dismiss-activity' deletes, permanently
//
// Both land in _dismissActivity, which now takes a mode. The routing and the
// per-category key resolution are shared on purpose — duplicating ninety lines
// of it would have guaranteed the two copies drifted.
//
// The real methods are sliced out of the shipped module and run against a fake
// service instance, so these assertions cannot pass over a paraphrase.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const PANEL = join(__dirname, "..", "src", "drumee", "builtins", "panel", "activity", "index.js");
const ITEM = join(__dirname, "..", "src", "drumee", "builtins", "panel", "activity", "widget", "item", "index.js");
const panelSrc = readFileSync(PANEL, "utf8");
const itemSrc = readFileSync(ITEM, "utf8");

// ------------------------------------------------------------------ globals
// Assigned on `global` and never passed as harness parameters — see
// harness-hygiene.test.js for why that combination decides tests by accident.
global.Visitor = { id: "me" };
global.SERVICE = {
  activity: {
    dismiss: "activity.dismiss",
    delete_activity: "activity.delete_activity",
    dismiss_contact_event: "activity.dismiss_contact_event",
    delete_contact_event: "activity.delete_contact_event",
    dismiss_rollup: "activity.dismiss_rollup",
    delete_rollup: "activity.delete_rollup",
  },
  secure_share: { mark_open_seen: "secure_share.mark_open_seen" },
};
global._a = new Proxy({}, { get: (_t, k) => String(k) });

// ------------------------------------------------------------------ slicing
function braceEnd(src, from, what) {
  let depth = 0;
  for (let i = src.indexOf("{", from); i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") { depth--; if (depth === 0) return i + 1; }
  }
  throw new Error(`unbalanced braces slicing ${what}`);
}
// The signature passed in ends with " {", so the body's own brace is its last
// character. Scanning from there and not from the start of the signature is
// what stops the `= {}` default parameter being mistaken for the body — a real
// bug in the first version of this harness, which sliced three characters.
function sliceMethod(src, signature) {
  const i = src.indexOf(signature);
  if (i < 0) throw new Error(`could not find ${signature} — the slicer is stale, fix it rather than the test`);
  const bodyBrace = i + signature.length - 1;
  if (src[bodyBrace] !== "{") throw new Error(`signature must end at the body brace: ${signature}`);
  return src.slice(i, braceEnd(src, bodyBrace, signature));
}

const dismissSrc = sliceMethod(panelSrc, "async _dismissActivity(cmd, args = {}, mode = 'delete') {");
const markReadSrc = sliceMethod(panelSrc, "_markRowRead(cmd) {");

// Guard the slices, so a silent mis-slice can never masquerade as a pass.
for (const [blk, needle] of [
  [dismissSrc, "const read = mode === 'read'"],
  [dismissSrc, "delete_activity"],
  [dismissSrc, "delete_rollup"],
  [markReadSrc, "dataset.unread"],
]) {
  assert.ok(blk.includes(needle), `sliced block is missing ${needle} — slicer is wrong`);
}

const methods = new Function(`return { ${dismissSrc}, ${markReadSrc} };`)();

// ------------------------------------------------------------------ fakes
function fakeRow() {
  const rowEl = { dataset: { unread: "1" } };
  const el = {
    isConnected: true,
    matches: () => false,
    querySelector: (sel) => (sel === "[data-unread]" ? rowEl : null),
  };
  return { rowEl, el };
}

function fakeCmd(model, row) {
  return {
    el: row.el,
    _model: { ...model },
    mget(k) { return this._model[k]; },
    mset(k, v) { this._model[k] = v; },
    goodbyeCalls: 0,
    goodbye() { this.goodbyeCalls++; },
  };
}

function fakeCtx() {
  return {
    posts: [],
    badge: 0,
    _dismissedKeys: new Set(),
    _dismissedLastIds: new Map(),
    verbose() {}, warn() {},
    _decrementBadge(by = 1) { this.badge += by; },
    _markRowRead(cmd) { return methods._markRowRead.call(this, cmd); },
    async postService(opt) { this.posts.push(opt); return {}; },
  };
}

async function act(model, mode, args = {}) {
  const row = fakeRow();
  const cmd = fakeCmd(model, row);
  const ctx = fakeCtx();
  await methods._dismissActivity.call(ctx, cmd, args, mode);
  return { ctx, cmd, row };
}

// ------------------------------------------------------- the panel defaults
test("the panel opens showing read AND unread", () => {
  // The whole feature is invisible without this: an unread-only default filters
  // a row out the instant it is read, no matter what the row does afterwards.
  assert.match(panelSrc, /this\._unreadsOnly = 0;/);
  assert.ok(!/this\._unreadsOnly = 1;/.test(panelSrc), "the unread-only default must be gone");
});

test("the bell badge query stays unread-only regardless of the toggle", () => {
  // These rows are never rendered — they feed the count. Passing the toggle
  // here made the badge include already-read task mentions once the default
  // flipped.
  const i = panelSrc.indexOf("type: 'mention',");
  assert.ok(i > 0, "the task-mention fetch moved — re-point this test");
  const window = panelSrc.slice(i, i + 600);
  assert.match(window, /unread_only: 1,/);
  assert.ok(!/unread_only: this\._unreadsOnly/.test(window), "must not follow the toggle");
});

test("the panel routes both services", () => {
  assert.match(panelSrc, /case 'dismiss-activity':\s*\n\s*return this\._dismissActivity\(cmd, args, 'delete'\);/);
  assert.match(panelSrc, /case 'read-activity':\s*\n\s*return this\._dismissActivity\(cmd, args, 'read'\);/);
});

// ------------------------------------------------- the item widget's split
test("every body click reads; only the trash button deletes", () => {
  // The two regions are the whole safety property. _dispatchService handles the
  // trash BUTTON; onUiEvent handles the row body. If a body-click site ever
  // fires 'dismiss-activity' again, merely opening a notification destroys it.
  const boundary = itemSrc.indexOf("  onUiEvent(cmd, args = {})");
  assert.ok(boundary > 0, "onUiEvent moved — re-point this test");
  const trashRegion = itemSrc.slice(0, boundary);
  const bodyRegion = itemSrc.slice(boundary);
  const count = (s, re) => (s.match(re) || []).length;

  assert.equal(count(bodyRegion, /service: 'dismiss-activity'/g), 0,
    "a body click must never fire the permanent-delete service");
  assert.equal(count(bodyRegion, /service: 'read-activity'/g), 12,
    "all twelve body-click sites must mark read");
  assert.equal(count(trashRegion, /service: 'dismiss-activity'/g), 8,
    "the trash button must still delete");
  assert.equal(count(trashRegion, /service: 'read-activity'/g), 0,
    "the trash button must not merely mark read");
});

// ------------------------------------------------------------ read vs delete
test("reading an mfs row keeps it, and marks it read", async () => {
  const { ctx, cmd, row } = await act(
    { item_type: "mfs", changelog_id: 7, item_key: "mfs:7" }, "read");
  assert.equal(ctx.posts.length, 1);
  assert.equal(ctx.posts[0].service, "activity.dismiss");
  assert.equal(ctx.posts[0].changelog_id, 7);
  assert.equal(cmd.goodbyeCalls, 0, "the row must survive being read");
  assert.equal(row.rowEl.dataset.unread, "0", "the unread tint must drop");
  assert.equal(cmd.mget("is_read"), 1, "a re-render must not bring the tint back");
  assert.equal(ctx._dismissedKeys.size, 0, "reading must not hide the row from refreshes");
  assert.equal(ctx.badge, 1, "reading one notification decrements the unread badge");
});

test("trashing an mfs row deletes it permanently", async () => {
  const { ctx, cmd } = await act(
    { item_type: "mfs", changelog_id: 7, item_key: "mfs:7" }, "delete");
  assert.equal(ctx.posts[0].service, "activity.delete_activity");
  assert.equal(cmd.goodbyeCalls, 1, "the row must go");
  assert.ok(ctx._dismissedKeys.has("mfs:7"), "and stay gone across this session's refreshes");
  assert.equal(ctx.badge, 1);
});

test("contact rows route to their own pair of endpoints", async () => {
  const model = { item_type: "contact_invite", changelog_id: 42, item_key: "contact_invite:42" };
  const r = await act(model, "read");
  assert.equal(r.ctx.posts[0].service, "activity.dismiss_contact_event");
  assert.equal(r.ctx.posts[0].activity_id, 42);
  assert.equal(r.cmd.goodbyeCalls, 0);

  const d = await act(model, "delete");
  assert.equal(d.ctx.posts[0].service, "activity.delete_contact_event");
  assert.equal(d.cmd.goodbyeCalls, 1);
});

test("rollups route to their own pair, carrying the resolved key", async () => {
  const model = { item_type: "chat", drumate_id: "peer9", hub_id: "H", last_id: 55, item_key: "chat:peer9" };
  const r = await act(model, "read");
  assert.equal(r.ctx.posts[0].service, "activity.dismiss_rollup");
  assert.equal(r.ctx.posts[0].key_id, "peer9", "chat keys on the peer's drumate_id");
  assert.equal(r.cmd.goodbyeCalls, 0, "a read rollup is re-rendered from the server's stored copy");

  const d = await act(model, "delete");
  assert.equal(d.ctx.posts[0].service, "activity.delete_rollup");
  assert.equal(d.ctx.posts[0].key_id, "peer9");
  assert.equal(d.cmd.goodbyeCalls, 1);
});

test("share-open rows persist the seen state without vanishing", async () => {
  const model = { item_type: "share_open", token_id: "TOK", recipient_email: "a@b.c", item_key: "share_open:1" };
  const r = await act(model, "read");
  assert.equal(r.ctx.posts[0].service, "secure_share.mark_open_seen");
  assert.equal(r.cmd.goodbyeCalls, 0);
});

test("the badge only moves for a row that was actually unread", async () => {
  // A read row now stays in the list and stays clickable. Before this guard,
  // opening the same notification twice walked the bell badge down once per
  // click, and the number stopped matching anything the user could see.
  const first = await act({ item_type: "mfs", changelog_id: 7, item_key: "mfs:7" }, "read");
  assert.equal(first.ctx.badge, 1, "the first read counts");

  const second = await act(
    { item_type: "mfs", changelog_id: 7, item_key: "mfs:7", is_read: 1 }, "read");
  assert.equal(second.ctx.badge, 0, "re-reading an already-read row must not count again");

  const trashed = await act(
    { item_type: "mfs", changelog_id: 7, item_key: "mfs:7", is_read: 1 }, "delete");
  assert.equal(trashed.ctx.badge, 0, "nor does trashing something already read");
  assert.equal(trashed.cmd.goodbyeCalls, 1, "but it is still deleted");
});

test("a failing write never removes the row", async () => {
  // Removing a row whose deletion did not land would show the user a deletion
  // that silently un-happens on the next reload.
  const row = fakeRow();
  const cmd = fakeCmd({ item_type: "mfs", changelog_id: 7, item_key: "mfs:7" }, row);
  const ctx = fakeCtx();
  ctx.postService = async () => { throw new Error("network"); };
  await methods._dismissActivity.call(ctx, cmd, {}, "delete");
  assert.equal(cmd.goodbyeCalls, 0, "a failed delete must leave the row on screen");
});

test("marking read survives a row that already left the DOM", async () => {
  // A read can resolve after the list restarted. Throwing there would be logged
  // as a failed dismiss and mislead whoever reads the console.
  const ctx = fakeCtx();
  const cmd = { el: { isConnected: false }, mset() {}, mget() {} };
  assert.doesNotThrow(() => methods._markRowRead.call(ctx, cmd));
  assert.doesNotThrow(() => methods._markRowRead.call(ctx, null));
});
