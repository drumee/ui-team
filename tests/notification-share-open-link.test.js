// Share-open notification deep link ("{email} opened {X}").
//
// The branch used to hardcode `filetype=folder&pid=0` for every row, so a shared
// FILE was opened as "a folder with no parent" and the desk rendered a phantom
// empty folder bearing the file's name. A file is now revealed inside its
// parent, the way the media rows already do it.
//
// The invariant these tests defend: when the server sends no node_filetype (an
// older deployment, or a node whose attributes could not be read) the URL must
// be BYTE-IDENTICAL to the one this branch produced before the change. And
// `filetype` must never be dropped from the hash — without it the desk silently
// opens the workspace root instead of the target.
//
// The real `case 'share_open':` body is sliced out of the widget and executed,
// so this cannot drift from the shipped code.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ITEM = join(__dirname, "../src/drumee/builtins/panel/activity/widget/item/index.js");
const src = readFileSync(ITEM, "utf8");

function shareOpenBody() {
  const start = src.indexOf("case 'share_open': {");
  assert.ok(start > -1, "the share_open case moved or was renamed");
  let depth = 0;
  for (let j = src.indexOf("{", start); j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) {
      return src.slice(src.indexOf("{", start) + 1, j).replace(/\bbreak;\s*$/, "");
    }
  }
  throw new Error("unbalanced braces in the share_open case");
}
const BODY = shareOpenBody();

// `_a` is a createSafeObject at runtime: a missing key yields the key's own
// name, so `_a.folder` is the string "folder".
const attr = new Proxy({}, { get: (_t, k) => String(k) });

// "_a" / "location" / "hub_id" … are harness parameters and are never assigned
// on global in this file — see harness-hygiene.test.js.
const run = new Function(
  "_a",
  "location",
  "hub_id",
  "nid",
  "ts",
  "item_type",
  "item_key",
  `return (function(){ ${BODY} }).call(this);`,
);

function open(model) {
  const location = { hash: "" };
  const triggered = [];
  const self = {
    mget: (k) => model[k],
    triggerHandlers: (a) => triggered.push(a),
  };
  run.call(self, attr, location, model.hub_id, model.nid || "0", "TS", "mfs", "share_open:1");
  return { hash: location.hash, triggered };
}

const legacy = (hub, nid) => `#/desk/wm/open/?hub_id=${hub}&nid=${nid}&filetype=folder&pid=0&ts=TS`;

test("no node_filetype falls back to the pre-change link, byte for byte", () => {
  for (const model of [
    { hub_id: "H1", node_id: "N1" },
    { hub_id: "H1", node_id: "N1", node_filetype: "" },
    { hub_id: "H1", node_id: "N1", node_filetype: null },
    { hub_id: "H1", node_id: "N1", node_filetype: undefined },
  ]) {
    assert.equal(open(model).hash, legacy("H1", "N1"));
  }
});

test("node_id absent still falls back to nid, as before", () => {
  assert.equal(open({ hub_id: "H1", nid: "NID9" }).hash, legacy("H1", "NID9"));
});

test("folder and workspace targets keep opening the target itself", () => {
  for (const ft of ["folder", "hub"]) {
    assert.equal(
      open({ hub_id: "H1", node_id: "N1", node_filetype: ft, node_parent_id: "0" }).hash,
      legacy("H1", "N1"),
    );
  }
});

test("a shared file is revealed inside its parent, not opened as a folder", () => {
  const { hash } = open({
    hub_id: "H1", node_id: "FILE1", node_filetype: "image", node_parent_id: "PARENT1",
  });
  assert.equal(
    hash,
    "#/desk/wm/open/?hub_id=H1&nid=FILE1&filetype=image&pid=PARENT1&highlight=1&ts=TS",
  );
  assert.ok(!hash.includes("filetype=folder"), "must not claim the file is a folder");
});

test("every non-folder category the MFS reports produces a reveal link", () => {
  for (const ft of ["image", "video", "audio", "document", "text", "note", "md", "other", "link"]) {
    assert.equal(
      open({ hub_id: "H", node_id: "F", node_filetype: ft, node_parent_id: "P" }).hash,
      `#/desk/wm/open/?hub_id=H&nid=F&filetype=${ft}&pid=P&highlight=1&ts=TS`,
    );
  }
});

test("a file with no parent still reveals, with pid=0", () => {
  const { hash } = open({ hub_id: "H", node_id: "F", node_filetype: "image" });
  assert.equal(hash, "#/desk/wm/open/?hub_id=H&nid=F&filetype=image&pid=0&highlight=1&ts=TS");
});

test("parent_id \"0\" is a legitimate parent (the workspace root)", () => {
  const { hash } = open({
    hub_id: "H", node_id: "F", node_filetype: "image", node_parent_id: "0",
  });
  assert.equal(hash, "#/desk/wm/open/?hub_id=H&nid=F&filetype=image&pid=0&highlight=1&ts=TS");
});

test("filetype, hub_id and nid are always on the hash", () => {
  // Losing filetype makes the desk open the workspace ROOT instead of the
  // target — the same trap as the shortened designation link.
  for (const model of [
    { hub_id: "H", node_id: "N" },
    { hub_id: "H", node_id: "N", node_filetype: "folder" },
    { hub_id: "H", node_id: "N", node_filetype: "hub" },
    { hub_id: "H", node_id: "N", node_filetype: "image", node_parent_id: "P" },
    { hub_id: "H", node_id: "N", node_filetype: "image" },
  ]) {
    const { hash } = open(model);
    assert.match(hash, /[?&]filetype=[^&]+/, hash);
    assert.match(hash, /[?&]hub_id=[^&]+/, hash);
    assert.match(hash, /[?&]nid=[^&]+/, hash);
  }
});

test("the seen/dismiss side effects are unchanged in every case", () => {
  for (const model of [
    { hub_id: "H", node_id: "N" },
    { hub_id: "H", node_id: "N", node_filetype: "folder" },
    { hub_id: "H", node_id: "N", node_filetype: "image", node_parent_id: "P" },
  ]) {
    const { triggered } = open({ ...model, token_id: "TOK", recipient_email: "a@b.c" });
    assert.equal(triggered.length, 2, "exactly dismiss + close");
    const dismiss = triggered.find((t) => t.service === "dismiss-activity");
    assert.ok(dismiss, "dismiss-activity must still fire");
    // Both are what secure_share.mark_open_seen needs to persist the seen state.
    assert.equal(dismiss.token_id, "TOK");
    assert.equal(dismiss.recipient_email, "a@b.c");
    assert.ok(triggered.some((t) => t.service === "close-activity-panel"));
  }
});
