const test = require("node:test");
const assert = require("node:assert/strict");

const {
  isMoveResultSuccessful,
  selectCrossWorkspaceMoveService,
} = require("../src/drumee/builtins/media/file-thread-move-route");

const services = {
  media: {
    move_cross_hub: "media.move_cross_hub",
    workspace_move: "media.workspace_move",
  },
};

test("file threads use the durable cross-hub move coordinator", () => {
  const service = selectCrossWorkspaceMoveService(
    { exists_thread: 1, file_thread_id: "thread-1" },
    services,
  );

  assert.equal(service, "media.move_cross_hub");
});

test("files without a thread keep the generic workspace move", () => {
  const service = selectCrossWorkspaceMoveService(
    { exists_thread: 0 },
    services,
  );

  assert.equal(service, "media.workspace_move");
});

test("an incomplete thread probe does not enter the thread saga", () => {
  const service = selectCrossWorkspaceMoveService(
    { exists_thread: 1 },
    services,
  );

  assert.equal(service, "media.workspace_move");
});

test("an empty thread probe keeps the generic workspace move", () => {
  assert.equal(
    selectCrossWorkspaceMoveService(null, services),
    "media.workspace_move",
  );
});

test("service fallbacks work before the runtime registry is hydrated", () => {
  assert.equal(
    selectCrossWorkspaceMoveService({ exists_thread: 0 }),
    "media.workspace_move",
  );
  assert.equal(
    selectCrossWorkspaceMoveService({ exists_thread: 1, file_thread_id: "thread-1" }),
    "media.move_cross_hub",
  );
});

test("only a committed thread saga is treated as a completed move", () => {
  assert.equal(
    isMoveResultSuccessful("media.move_cross_hub", { state: "committed" }, services),
    true,
  );
  assert.equal(
    isMoveResultSuccessful("media.move_cross_hub", { state: "compensated" }, services),
    false,
  );
  assert.equal(
    isMoveResultSuccessful("media.move_cross_hub", { state: "failed" }, services),
    false,
  );
});

test("legacy move responses remain truthy-compatible", () => {
  assert.equal(
    isMoveResultSuccessful("media.workspace_move", { nid: "file-1" }, services),
    true,
  );
  assert.equal(
    isMoveResultSuccessful("media.workspace_move", null, services),
    false,
  );
});
