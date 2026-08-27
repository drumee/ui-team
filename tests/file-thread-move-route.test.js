const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const interactSource = readFileSync(
  join(__dirname, "../src/drumee/builtins/media/interact.js"),
  "utf8",
);

function extractClassMethod(source, name) {
  const start = source.indexOf(`  ${name}()`);
  assert.notEqual(start, -1, `${name} not found in production source`);
  const end = source.indexOf("\n  }\n", start);
  assert.notEqual(end, -1, `${name} has no closing brace`);
  return source.slice(start, end + 4);
}

const moveSource = extractClassMethod(interactSource, "move");

test("single-destination cross-workspace moves use workspace_move", () => {
  assert.match(
    moveSource,
    /const movingAcrossWorkspaces = crossHub && isSingleDestinationMove;/,
  );
  assert.match(
    moveSource,
    /if \(movingAcrossWorkspaces\) \{[\s\S]*?service = \(SERVICE\.media && SERVICE\.media\.workspace_move\) \|\|\s*["']media\.workspace_move["'];[\s\S]*?\}/,
  );
});

test("the client does not probe for a thread or revive the retired move saga", () => {
  assert.doesNotMatch(moveSource, /file_thread_info/);
  assert.doesNotMatch(moveSource, /move_cross_hub/);
  assert.doesNotMatch(moveSource, /selectCrossWorkspaceMoveService/);
  assert.doesNotMatch(moveSource, /isMoveResultSuccessful/);
});

test("cross-workspace move payload keeps move semantics", () => {
  assert.match(
    moveSource,
    /const payload = crossHub \? \{[\s\S]*?service,[\s\S]*?action: movingAcrossWorkspaces \? _a\.move : _a\.copy,[\s\S]*?hub_id: itemHubId,[\s\S]*?recipient_id: dest\.hub_id,[\s\S]*?notify: 1,[\s\S]*?moved_in: 1,[\s\S]*?async: 1,/,
  );
});

test("same-workspace moves keep the media.move service", () => {
  assert.match(
    moveSource,
    /let service = crossHub \? SERVICE\.media\.copy : SERVICE\.media\.move;/,
  );
  assert.match(
    moveSource,
    /\} : \{\s*service: SERVICE\.media\.move,\s*nid,\s*pid,\s*action: _a\.move,\s*hub_id: itemHubId,/,
  );
});

test("multi-destination copies still trash the source only after copying", () => {
  assert.match(
    moveSource,
    /if \(!crossHubDestinations\.length \|\| isSingleDestinationMove\) return;\s*return this\.postService\(\{\s*service: SERVICE\.media\.trash,/,
  );
});
