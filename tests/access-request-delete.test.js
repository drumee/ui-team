// access-request-delete.test.js — the trash button on a pending secure-share
// access request ("{email} requests access to {folder}") must stick across
// reloads. It used to be client-only, so the request came back every day.
//   node --test tests/access-request-delete.test.js
//
// The access_request branch of _dismissActivity is sliced out of the real
// source and run against a stub panel, since the file only loads under webpack.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const PANEL = fs.readFileSync(path.join(__dirname, "../src/drumee/builtins/panel/activity/index.js"), "utf8");
const ITEM = fs.readFileSync(path.join(__dirname, "../src/drumee/builtins/panel/activity/widget/item/index.js"), "utf8");

// The `if (itemType === 'access_request') { … }` block, up to its closing brace.
function sliceBranch(src) {
  const head = "    if (itemType === 'access_request') {\n";
  const start = src.indexOf(head);
  if (start < 0) throw new Error("access_request branch not found");
  const end = src.indexOf("\n    }\n", start);
  return src.slice(start, end + 7);
}

global.Visitor = { id: "me" };
global.SERVICE = {};
const branch = new Function(
  "itemType", "args", "cmd", "read",
  `return (async () => {\n${sliceBranch(PANEL)}\n    return 'fell-through';\n  })();`,
);

function stubPanel({ fail } = {}) {
  const posted = [];
  const warned = [];
  return {
    posted,
    warned,
    postService: async (opt) => {
      posted.push(opt);
      if (fail) throw new Error("boom");
      return { status: "OK" };
    },
    warn: (...a) => warned.push(a),
  };
}

function stubRow(attrs) {
  const row = { gone: 0, mget: (k) => attrs[k], goodbye: () => { row.gone++; } };
  return row;
}

test("trash calls secure_share.delete_request with the request id, then removes the row", async () => {
  const panel = stubPanel();
  const row = stubRow({ request_id: "r1", hub_id: "h1" });
  await branch.call(panel, "access_request", { request_id: "r1" }, row, false);
  assert.deepEqual(panel.posted, [{ service: "secure_share.delete_request", hub_id: "me", request_id: "r1" }]);
  assert.equal(row.gone, 1);
  assert.ok(panel._dismissedKeys.has("access_request:r1"), "the key refreshActivity filters on");
});

test("the request id falls back to the row model when args do not carry it", async () => {
  const panel = stubPanel();
  const row = stubRow({ key_id: "r2", hub_id: "h1" });
  await branch.call(panel, "access_request", {}, row, false);
  assert.equal(panel.posted[0].request_id, "r2");
});

test("a failed request still removes the row and hides it for the session, as before", async () => {
  const panel = stubPanel({ fail: true });
  const row = stubRow({ request_id: "r3" });
  await branch.call(panel, "access_request", { request_id: "r3" }, row, false);
  assert.equal(row.gone, 1);
  assert.equal(panel.warned.length, 1);
  assert.ok(panel._dismissedKeys.has("access_request:r3"));
});

test("reading (opening) a request sends nothing and keeps the row", async () => {
  const panel = stubPanel();
  const row = stubRow({ request_id: "r4" });
  await branch.call(panel, "access_request", { request_id: "r4" }, row, true);
  assert.equal(panel.posted.length, 0);
  assert.equal(row.gone, 0);
});

test("without any request id nothing is sent, the row still goes (old behaviour)", async () => {
  const panel = stubPanel();
  const row = stubRow({});
  await branch.call(panel, "access_request", {}, row, false);
  assert.equal(panel.posted.length, 0);
  assert.equal(row.gone, 1);
});

test("other item types do not enter the branch", async () => {
  const panel = stubPanel();
  const out = await branch.call(panel, "share_open", { request_id: "r5" }, stubRow({}), false);
  assert.equal(out, "fell-through");
  assert.equal(panel.posted.length, 0);
});

test("the item's trash button forwards request_id", () => {
  const start = ITEM.indexOf("          case 'access_request':\n            // Pending secure-share request (Figma 62). Trash");
  assert.ok(start > 0, "access_request trash case not found");
  const block = ITEM.slice(start, ITEM.indexOf("return", start));
  assert.match(block, /service: 'dismiss-activity'/);
  assert.match(block, /request_id: this\.mget\('request_id'\)/);
});
