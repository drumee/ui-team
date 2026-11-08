// comment-unread.js: per-user unread comment counts behind the detail panel's
// subtask badge — fetch, mark-read, and live updates from comment pushes.
// The mixin is plain CommonJS, so it runs against a stub panel.
//
//   node --test tests/tasks-comment-unread.test.js
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

global.SERVICE = require("../src/drumee/lex/services.json");
global.Visitor = { id: "me" };

const mixin = require("../src/drumee/builtins/window/tasks/comment-unread");

const TASKS = {
  P: { id: "P", parent_task_id: null },
  A: { id: "A", parent_task_id: "P" },
  B: { id: "B", parent_task_id: "P" },
};

function makePanel({ detailId = "P", fetchResult, preset = {} } = {}) {
  const calls = { fetch: [], post: [], refresh: 0 };
  const host = Object.assign(
    {
      _commentUnread: new Map(Object.entries(preset)),
      _hubId: "H",
      _detailId: detailId,
      getTaskById: (id) => TASKS[id] || null,
      isSubtask: (t) => !!(t && t.parent_task_id),
      getSubtasks: (id) =>
        Object.values(TASKS).filter((t) => t.parent_task_id === id),
      _refreshSubtaskSection: () => {
        calls.refresh++;
        return Promise.resolve();
      },
      fetchService: async (opt) => {
        calls.fetch.push(opt);
        return fetchResult;
      },
      postService: async (opt) => {
        calls.post.push(opt);
        return { task_id: opt.task_id, read_ts: 1 };
      },
    },
    mixin,
  );
  return { host, calls };
}

const tick = () => new Promise((r) => setImmediate(r));

test("_loadCommentUnread fills the map and busts the cache", async () => {
  const { host, calls } = makePanel({ fetchResult: [{ task_id: "A", unread: 2 }] });
  await host._loadCommentUnread("P");
  assert.strictEqual(host.getCommentUnread("A"), 2);
  assert.strictEqual(host.getCommentUnread("B"), 0);
  assert.strictEqual(calls.fetch.length, 1);
  assert.strictEqual(calls.fetch[0].service, "task.comment_unread");
  assert.strictEqual(calls.fetch[0].parent_id, "P");
  assert.strictEqual(calls.fetch[0].hub_id, "H");
  assert.strictEqual(typeof calls.fetch[0]._ts, "number");
});

test("_loadCommentUnread clears children the server no longer reports", async () => {
  const { host } = makePanel({ fetchResult: [], preset: { A: 2 } });
  await host._loadCommentUnread("P");
  assert.strictEqual(host.getCommentUnread("A"), 0);
});

test("_loadCommentUnread on an old server leaves the map untouched", async () => {
  const { host } = makePanel({ fetchResult: undefined, preset: { A: 2 } });
  await host._loadCommentUnread("P");
  assert.strictEqual(host.getCommentUnread("A"), 2);
});

test("_markCommentsRead zeroes synchronously and posts", () => {
  const { host, calls } = makePanel({ preset: { A: 2 } });
  host._markCommentsRead("A");
  assert.strictEqual(host.getCommentUnread("A"), 0);
  assert.deepStrictEqual(calls.post, [
    { service: "task.comment_mark_read", hub_id: "H", task_id: "A" },
  ]);
});

test("mark_read bypasses the write guard", () => {
  const src = readFileSync(
    resolve(__dirname, "../src/drumee/builtins/window/tasks/index.js"),
    "utf8",
  );
  const mutations = new Function(
    `return ${sliceFunction(src, "static get TASK_MUTATIONS()").replace(
      /^static get TASK_MUTATIONS/,
      "function",
    )}`,
  )()();
  assert.ok(Array.isArray(mutations) && mutations.length > 0);
  assert.ok(!mutations.includes("task.comment_mark_read"));
  assert.ok(!mutations.includes("task.comment_unread"));
});

test("peer comment on a child of the open parent increments and repaints", () => {
  const { host, calls } = makePanel();
  host._onPeerCommentForUnread("task.comment_create", { task_id: "A", author_uid: "bob" });
  assert.strictEqual(host.getCommentUnread("A"), 1);
  assert.strictEqual(calls.refresh, 1);
});

test("own comment does not count", () => {
  const { host, calls } = makePanel();
  host._onPeerCommentForUnread("task.comment_create", { task_id: "A", author_uid: "me" });
  assert.strictEqual(host.getCommentUnread("A"), 0);
  assert.strictEqual(calls.refresh, 0);
});

test("peer comment on the subtask that is open re-marks read", () => {
  const { host, calls } = makePanel({ detailId: "A" });
  host._onPeerCommentForUnread("task.comment_create", { task_id: "A", author_uid: "bob" });
  assert.strictEqual(host.getCommentUnread("A"), 0);
  assert.deepStrictEqual(calls.post, [
    { service: "task.comment_mark_read", hub_id: "H", task_id: "A" },
  ]);
});

test("peer comment on a task unrelated to the open detail is ignored", () => {
  const { host, calls } = makePanel({ detailId: "B" });
  host._onPeerCommentForUnread("task.comment_create", { task_id: "A", author_uid: "bob" });
  assert.strictEqual(host.getCommentUnread("A"), 0);
  assert.strictEqual(calls.refresh, 0);
  assert.strictEqual(calls.post.length, 0);
});

test("a count fetch in flight across a mark-read does not resurrect the badge", async () => {
  // Open P (fetch F1 in flight) → open A (mark read) → F1 lands with the
  // server's pre-mark answer. A must stay read.
  let release;
  const { host } = makePanel({ preset: { A: 2 } });
  host.fetchService = (opt) =>
    new Promise((r) => {
      release = () => r([{ task_id: "A", unread: 2 }, { task_id: "B", unread: 1 }]);
    });
  const f1 = host._loadCommentUnread("P");
  host._markCommentsRead("A");
  release();
  await f1;
  assert.strictEqual(host.getCommentUnread("A"), 0);
  // A sibling with no newer mark still takes the fetched value.
  assert.strictEqual(host.getCommentUnread("B"), 1);
});

test("a mark-read before a fetch starts does not shield it", async () => {
  const { host } = makePanel({ fetchResult: [{ task_id: "A", unread: 1 }] });
  host._markCommentsRead("A");
  await host._loadCommentUnread("P");
  // The fetch began after the mark, so its answer is current.
  assert.strictEqual(host.getCommentUnread("A"), 1);
});

test("peer comment_delete on a child refetches the open parent", async () => {
  const { host, calls } = makePanel({ fetchResult: [], preset: { A: 1 } });
  host._onPeerCommentForUnread("task.comment_delete", { id: "c1", task_id: "A" });
  await tick();
  assert.strictEqual(calls.fetch.length, 1);
  assert.strictEqual(calls.fetch[0].parent_id, "P");
  assert.strictEqual(host.getCommentUnread("A"), 0);
  assert.strictEqual(calls.refresh, 1);
});
