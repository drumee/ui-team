// The Tasks panel's single write choke point (_guardTaskWrites) tells this
// tab's Personal Calendar about every task write — the calendar is the socket
// task._broadcast skips. Runs the REAL method against a stub `this`.
//
//   node --test tests/tasks-write-announces.test.js
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = readFileSync(
  resolve(__dirname, "../src/drumee/builtins/window/tasks/index.js"),
  "utf8",
);

// TASK_MUTATIONS is a static getter: read the real list out of the source.
const mutations = new Function(
  `return ${sliceFunction(SRC, "static get TASK_MUTATIONS()").replace(
    /^static get TASK_MUTATIONS/,
    "function",
  )}`,
)()();

function makeHost({ mayWrite = true, result = [{ id: 7 }], fails = false } = {}) {
  const calls = [];
  const announced = [];
  const guard = new Function(
    "announceTaskWrite", "Visitor", "_a",
    `return ${sliceFunction(SRC, "_guardTaskWrites()")}`,
  )(
    (service, res) => announced.push([service, res]),
    { get: () => "sock-1" },
    { socket_id: "socket_id" },
  );
  const host = {
    constructor: { TASK_MUTATIONS: mutations },
    _mayWriteTasks: () => mayWrite,
    _sayCannotEditTasks: () => {},
    postService: async (...args) => {
      calls.push(args);
      return fails ? undefined : result;
    },
  };
  guard.call(host);
  return { host, calls, announced };
}

test("a successful update_assignee is announced with its result", async () => {
  const { host, announced } = makeHost();
  const res = await host.postService({
    service: "task.update_assignee", id: 7, assignee_uids: ["u2"],
  });
  assert.deepStrictEqual(res, [{ id: 7 }]);
  assert.deepStrictEqual(announced, [["task.update_assignee", [{ id: 7 }]]]);
});

test("the string-name form announces under that name", async () => {
  const { host, announced } = makeHost();
  await host.postService("task.create", { title: "x" });
  assert.strictEqual(announced.length, 1);
  assert.strictEqual(announced[0][0], "task.create");
});

test("a refused write never reaches the server and is not announced", async () => {
  const { host, calls, announced } = makeHost({ mayWrite: false });
  const res = await host.postService({ service: "task.update", id: 7 });
  assert.strictEqual(res, undefined);
  assert.strictEqual(calls.length, 0);
  assert.deepStrictEqual(announced, []);
});

test("a failed write hands announceTaskWrite undefined to drop", async () => {
  const { host, announced } = makeHost({ fails: true });
  await host.postService({ service: "task.update", id: 7 });
  assert.deepStrictEqual(announced, [["task.update", undefined]]);
});

test("the socket_id stamp is kept", async () => {
  const { host, calls } = makeHost();
  await host.postService({ service: "task.update", id: 7 });
  assert.strictEqual(calls[0][0].socket_id, "sock-1");
});
