// Device uploads sent through a chat are promoted into the folder the post
// writes to. The workspace team chat reads the whole hub (scopedNid is empty
// by design) but still writes into the folder the user stands in (postNid).
// Gating promotion on the READ scope left every workspace-chat upload in the
// hidden /__chat__/ sbox: no folder placement, so the file's thread never
// reached the folder's thread rail and "Show in folder" revealed nothing.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SRC = join(__dirname, "..", "src/drumee/builtins/widget/chat/index.js");
const WRITE = 0b0001000;

// Lift the method body out of the class so it runs against a stub `this`
// without booting the Skeletons runtime the widget otherwise needs.
function gate() {
  const src = readFileSync(SRC, "utf8");
  const m = src.match(/canPromoteDeviceAttachmentsToFolder\(\) \{([\s\S]*?)\n  \}/);
  assert.ok(m, "canPromoteDeviceAttachmentsToFolder not found");
  return new Function("_K", `return function () {${m[1]}\n};`)({ permission: { write: WRITE } });
}

const widget = ({ scopedNid = "", postNid = "", privilege = 0 }) => ({
  getScopedNid: () => scopedNid,
  getPostNid: () => postNid || scopedNid,
  _scopePrivilege: () => privilege,
});

test("workspace chat (read scope empty, write scope set) promotes device uploads", () => {
  const can = gate();
  assert.equal(can.call(widget({ postNid: "folder1", privilege: 0b1111 })), true);
});

test("a folder-scoped chat still promotes", () => {
  const can = gate();
  assert.equal(can.call(widget({ scopedNid: "folder1", privilege: 0b1111 })), true);
});

test("no destination folder → nothing to promote into", () => {
  const can = gate();
  assert.equal(can.call(widget({ privilege: 0b1111 })), false);
});

test("a member without the write bit never promotes", () => {
  const can = gate();
  assert.equal(can.call(widget({ postNid: "folder1", privilege: 0b0111 })), false);
});
