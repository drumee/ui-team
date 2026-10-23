// tests/tasks-list-inline-subtask.test.js — the List view's ＋ opens an inline
// "Enter subtask name..." row under the parent (Figma 873:238375) instead of
// the detail panel; Enter creates the child there.
//
//   node --test tests/tasks-list-inline-subtask.test.js
//
// Runs the REAL mixin (list-subtask.js) and the REAL _postSubtask, sliced out
// of index.js, against a stub `this`.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/tasks");
const SRC = fs.readFileSync(path.join(DIR, "index.js"), "utf8");
const LIST = fs.readFileSync(path.join(DIR, "skeleton/list.js"), "utf8");
global.SERVICE = { task: { create: "task.create" } };
const mixin = require(path.join(DIR, "list-subtask.js"));
const postSubtask = new Function(`return ${sliceFunction(SRC, "async _postSubtask(parentId, fields)")}`)();

const trig = (taskId) => ({ mget: (k) => (k === "taskId" ? taskId : undefined) });

function panel(extra = {}) {
  const calls = { refresh: 0, posted: [], alerts: 0, synced: [], merged: [] };
  const input = { value: "" };
  const p = {
    ...mixin,
    calls,
    input,
    _subtasksOpen: new Set(),
    _inlineSubtask: null,
    _hubId: "h1",
    _scopeNid: "n1",
    getColumns: () => [{ key: "todo" }, { key: "done", is_done: 1 }],
    _refreshViewBody() {
      calls.refresh++;
      return Promise.resolve();
    },
    _inlineSubtaskInput: () => input,
    _flagInlineSubtaskTooLong() {
      calls.tooLong = true;
    },
    _postSubtask: async (parentId, fields) => {
      calls.posted.push([parentId, fields]);
      return { id: "c9", parent_task_id: parentId };
    },
    _alertWriteFailed() {
      calls.alerts++;
    },
    ...extra,
  };
  return p;
}

test("＋ expands the parent and opens the inline creator", () => {
  const p = panel();
  p._openInlineSubtask(trig("p1"));
  assert.ok(p._subtasksOpen.has("p1"));
  assert.equal(p.getInlineSubtask().parentId, "p1");
  assert.equal(p.calls.refresh, 1);
});

test("Enter creates the child under the parent in the first open column", async () => {
  const p = panel();
  p._openInlineSubtask(trig("p1"));
  p.input.value = "  Write brief  ";
  await p._commitInlineSubtask();
  assert.deepEqual(p.calls.posted, [["p1", { title: "Write brief", priority: "medium", status: "todo" }]]);
  assert.equal(p.getInlineSubtask(), null);
});

test("an empty title closes the creator without posting", async () => {
  const p = panel();
  p._openInlineSubtask(trig("p1"));
  p.input.value = "   ";
  await p._commitInlineSubtask();
  assert.equal(p.calls.posted.length, 0);
  assert.equal(p.getInlineSubtask(), null);
});

test("a title over the limit keeps the creator open and posts nothing", async () => {
  const p = panel();
  p._openInlineSubtask(trig("p1"));
  p.input.value = "x".repeat(5000);
  await p._commitInlineSubtask();
  assert.equal(p.calls.posted.length, 0);
  assert.equal(p.calls.tooLong, true);
  assert.equal(p.getInlineSubtask().parentId, "p1");
});

test("a failed create keeps the creator open with the typed title", async () => {
  const p = panel({ _postSubtask: async () => null });
  p._openInlineSubtask(trig("p1"));
  p.input.value = "Write brief";
  await p._commitInlineSubtask();
  assert.equal(p.getInlineSubtask().parentId, "p1");
  assert.equal(p.input.value, "Write brief");
});

test("a second Enter while the first create is in flight posts once", async () => {
  let release;
  const p = panel({
    _postSubtask: (parentId, fields) => {
      p.calls.posted.push([parentId, fields]);
      return new Promise((r) => (release = () => r({ id: "c9" })));
    },
  });
  p._openInlineSubtask(trig("p1"));
  p.input.value = "Write brief";
  const first = p._commitInlineSubtask();
  await p._commitInlineSubtask();
  release();
  await first;
  assert.equal(p.calls.posted.length, 1);
});

test("Escape / cancel clears the creator and repaints", () => {
  const p = panel();
  p._openInlineSubtask(trig("p1"));
  p._closeInlineSubtask();
  assert.equal(p.getInlineSubtask(), null);
  assert.equal(p.calls.refresh, 2);
});

test("_postSubtask posts with parent_task_id and repaints the view (badges/strips)", async () => {
  const sent = [];
  const self = {
    _hubId: "h1",
    _scopeNid: "n1",
    postService: async (o) => (sent.push(o), [{ id: "c9", parent_task_id: "p1" }]),
    _mergeTask(row) {
      self.merged = row;
    },
    _syncSubtaskBadges(id) {
      self.synced = id;
    },
    _refreshViewBody() {
      self.refreshed = (self.refreshed || 0) + 1;
    },
    _alertWriteFailed() {
      self.alerted = 1;
    },
  };
  const row = await postSubtask.call(self, "p1", { title: "Write brief", status: "todo" });
  assert.equal(row.id, "c9");
  assert.equal(sent[0].service, "task.create");
  assert.equal(sent[0].parent_task_id, "p1");
  assert.equal(sent[0].hub_id, "h1");
  assert.equal(sent[0].title, "Write brief");
  assert.equal(sent[0].priority, "medium");
  assert.deepEqual(sent[0].assignee_uids, []);
  assert.equal(self.merged.id, "c9");
  assert.equal(self.synced, "p1");
  assert.equal(self.refreshed, 1);
});

test("_postSubtask alerts and returns null when the server refuses", async () => {
  const self = {
    postService: async () => null,
    _alertWriteFailed() {
      self.alerted = 1;
    },
  };
  assert.equal(await postSubtask.call(self, "p1", { title: "x" }), null);
  assert.equal(self.alerted, 1);
});

test("the List ＋ opens the inline creator, only for editors, never on a child row", () => {
  const start = LIST.indexOf("const titleCell = (");
  const body = LIST.slice(start, LIST.indexOf("\n  };\n", start));
  assert.match(body, /canEdit && !sub\s*\?\s*Skeletons\.Button\.Svg\(\{(?:(?!\}\)).)*service: "list-add-subtask"/s);
  assert.doesNotMatch(body, /"add-child-task"/);
});

test("the inline ＋ and Enter are gated as task writes", () => {
  assert.match(SRC, /"list-add-subtask", "list-subtask-commit"/);
});
