// tests/tasks-push-hub-scope.test.js — a task push from another workspace.
//
//   node --test tests/tasks-push-hub-scope.test.js
//
// Thomas (2026-10-16): tasks created in workspace A showed up on workspace B's
// Task tab. A member of several workspaces hears all of them on one socket, a
// task row carries no hub_id, and a visible board merged every task.create it
// heard. The server now names the workspace in the envelope
// (options.hub_id); a push that names none may only patch a row the board
// already holds. Runs the REAL panel methods, sliced out of index.js.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/tasks");
const SRC = fs.readFileSync(path.join(DIR, "index.js"), "utf8");
const { peerPatch } = require(path.join(DIR, "live-sync.js"));

const SERVICE = {
  task: {
    create: "task.create", update: "task.update", update_status: "task.update_status",
    update_assignee: "task.update_assignee", delete: "task.delete",
    link_label: "task.link_label", unlink_label: "task.unlink_label",
    link_file: "task.link_file", unlink_file: "task.unlink_file",
    column_create: "task.column_create", column_update: "task.column_update",
    column_set_done: "task.column_set_done", column_delete: "task.column_delete",
    comment_create: "task.comment_create", comment_update: "task.comment_update",
    comment_delete: "task.comment_delete", comment_react: "task.comment_react",
  },
};

const build = (sig, ...names) =>
  new Function(...names, `return ${sliceFunction(SRC, sig)}`);

const pushHub = build("_pushHub(data, options)")();
// onWsMessage calls super.onWsMessage, so it is evaluated as a class member.
function classMethod(signature) {
  const start = SRC.indexOf(`\n  ${signature} {`);
  assert.ok(start > -1, `${signature} not found`);
  const end = SRC.indexOf("\n  }\n", start);
  return SRC.slice(start, end + 4);
}
const onWsMessage = new Function(
  "SERVICE",
  `class Base { onWsMessage() { this.passedUp = (this.passedUp || 0) + 1; } }
   return class extends Base { ${classMethod("onWsMessage(svc, data, options = {})")} }.prototype.onWsMessage;`,
)(SERVICE);
const applyPeer = build("_applyPeerTaskChange(service, data, options = {})", "peerPatch")(peerPatch);

const HUB_B = "b0b0b0b0b0b0b0b0";
const HUB_A = "a0a0a0a0a0a0a0a0";

function makeBoard(tasks = []) {
  const p = {
    _hubId: HUB_B,
    _tasks: tasks.map((t) => ({ ...t })),
    reloads: [],
    _pushHub: pushHub,
    _applyPeerTaskChange: applyPeer,
    _isPanelHidden: () => false,
    _mergeTask(row) {
      const i = this._tasks.findIndex((t) => t.id === row.id);
      if (i === -1) this._tasks.push(row);
      else this._tasks[i] = { ...this._tasks[i], ...row };
    },
    _toastPeerListEdit() {},
    _syncSubtaskBadges() {},
    _queueWsRefresh(what) { this.reloads.push(what); },
    _onPeerTaskDeleted() {},
    _onPeerColumnDeleted() {},
    getView: () => "board",
  };
  p.onWsMessage = onWsMessage;
  return p;
}

const row = (id, extra = {}) => ({ id, title: `t-${id}`, status: "todo", ...extra });

test("Thomas's case: workspace A's task.create never lands on board B", () => {
  const b = makeBoard();
  b.onWsMessage("live.update", row("aaaa000000000001"), { service: "task.create", hub_id: HUB_A });
  assert.equal(b._tasks.length, 0);
  assert.deepEqual(b.reloads, []);
  assert.equal(b.passedUp, 1);
});

test("every task push from another workspace is ignored, not just create", () => {
  const b = makeBoard([row("bbbb000000000001")]);
  for (const service of Object.values(SERVICE.task)) {
    b.onWsMessage("live.update", { ...row("bbbb000000000001"), task_id: "bbbb000000000001" },
      { service, hub_id: HUB_A });
  }
  assert.deepEqual(b._tasks, [row("bbbb000000000001")]);
  assert.deepEqual(b.reloads, []);
});

test("a peer's task.create in THIS workspace is still merged in place", () => {
  const b = makeBoard();
  b.onWsMessage("live.update", row("bbbb000000000002"), { service: "task.create", hub_id: HUB_B });
  assert.deepEqual(b._tasks.map((t) => t.id), ["bbbb000000000002"]);
  assert.deepEqual(b.reloads, []);
});

test("a peer's update in THIS workspace patches the row without a reload", () => {
  const b = makeBoard([row("bbbb000000000003")]);
  b.onWsMessage("live.update", row("bbbb000000000003", { title: "renamed" }),
    { service: "task.update", hub_id: HUB_B });
  assert.equal(b._tasks[0].title, "renamed");
  assert.deepEqual(b.reloads, []);
});

test("old server (no hub named): an unknown row is reloaded, never merged", () => {
  const b = makeBoard();
  b.onWsMessage("live.update", row("aaaa000000000004"), { service: "task.create" });
  assert.equal(b._tasks.length, 0);
  assert.equal(b.reloads.length, 1);
  assert.equal(b.reloads[0].tasks, 1);
});

test("old server (no hub named): a row the board holds is still patched", () => {
  const b = makeBoard([row("bbbb000000000005")]);
  b.onWsMessage("live.update", row("bbbb000000000005", { status: "complete" }),
    { service: "task.update_status" });
  assert.equal(b._tasks[0].status, "complete");
  assert.deepEqual(b.reloads, []);
});

test("a payload naming its own hub (unassign announcement) still filters", () => {
  const b = makeBoard();
  b.onWsMessage("live.update", { hub_id: HUB_A, uid: "x" }, { service: "task.update_assignee" });
  assert.deepEqual(b.reloads, []);
  b.onWsMessage("live.update", { hub_id: HUB_B, uid: "x" }, { service: "task.update_assignee" });
  assert.equal(b.reloads.length, 1);
  assert.equal(b.reloads[0].members, 1);
});
