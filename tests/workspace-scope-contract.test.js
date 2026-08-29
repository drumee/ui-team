// Tasks and chat are WORKSPACE-scoped, not folder-scoped (Figma 43:23955).
//
// The board shows every task in the workspace whatever folder it was created
// in, and there is one team chat per workspace. Walking into a subfolder must
// change neither. What it still changes is where a NEW task and a post's
// staged uploads LAND — reading and writing no longer share a scope, and the
// whole migration turns on keeping those two apart.
//
// The one place folder scope survives is a DMZ share, where it is an ACCESS
// boundary rather than a view preference: the recipient was given one folder
// and must read that folder's conversation only. That distinction is the most
// important thing in this file.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const SRC = join(ROOT, "src/drumee");

const stripComments = (s) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

const read = (p) => stripComments(readFileSync(join(SRC, p), "utf8"));

const tasks = read("builtins/window/tasks/index.js");
const chat = read("builtins/widget/chat/index.js");
const toolkit = read("builtins/window/skeleton/toolkit/index.js");

// Body of a named method, so an assertion cannot drift into a neighbour.
function methodBody(src, name) {
  const start = src.indexOf(`\n  ${name}(`);
  assert.ok(start > 0, `${name}() not found`);
  const rest = src.slice(start + 1);
  const end = rest.indexOf("\n  }");
  return rest.slice(0, end);
}

test("the board asks for the whole workspace", () => {
  const load = methodBody(tasks, "async _loadTasks");
  assert.match(load, /workspace:\s*1/, "task.list must request workspace scope");

  // Deliberate redundancy: a server predating the flag ignores `workspace` and
  // reads these instead, so a staggered deploy degrades to the old
  // folder-scoped list rather than returning EMPTY — which is what "workspace
  // only" looks like against an old server.
  assert.match(load, /nid:\s*this\._scopeNid/, "keep the deploy-skew fallback");
  assert.match(load, /include_unscoped:\s*this\._scopeIsRoot/);
});

test("column calls send no nid — there is one column set per workspace", () => {
  // Sending a nid would imply it still selects something. The procs resolve
  // the single workspace scope themselves.
  for (const m of [
    "async _loadColumns",
    "async _loadColumnWatches",
    "async _persistColumnOrder",
  ]) {
    const body = methodBody(tasks, m);
    assert.doesNotMatch(body, /nid:/, `${m} must not send a nid`);
  }
});

test("navigating folders does not reload or wipe the board", () => {
  const setScope = methodBody(tasks, "setScope");

  // The board does not change, so it must not be torn down and rebuilt
  // identical on every step into a subfolder.
  assert.doesNotMatch(setScope, /this\._tasks\s*=\s*\[\]/, "must not drop loaded rows");
  assert.doesNotMatch(setScope, /this\._creating\s*=\s*false/, "must not close an open draft");
  assert.doesNotMatch(setScope, /this\._detailId\s*=\s*null/, "must not close the detail panel");

  // It still re-points the write destination, and the one piece of per-folder
  // state the board keeps — the filename-collision cache — must follow.
  assert.match(setScope, /this\._destNid\s*=\s*destNid/);
  assert.match(setScope, /this\._folderFilenames\s*=\s*null/);

  // A silently failed previous load is the only case that still refetches.
  assert.match(setScope, /_loadFailed/);
});

test("chat keeps the read scope and the write destination separate", () => {
  // scopedNid FILTERS reads; postNid is where uploads LAND. Collapsing them
  // either leaks other folders' messages into a share, or drops a dragged
  // file outside the folder the user is standing in.
  assert.match(
    chat,
    /this\.scopedNid\s*=\s*scope === _a\.folder \? nid : ""/,
    "only a folder-scoped surface filters reads",
  );
  assert.match(
    chat,
    /this\.postNid\s*=\s*scope === _a\.folder \|\| scope === "workspace" \? nid : ""/,
    "both scopes must record a write destination",
  );

  // The post payload must use the WRITE nid, or a file dropped into the
  // workspace chat stops being promoted into the folder.
  assert.match(chat, /api\.nid\s*=\s*this\.getPostNid\(\)/);

  // Under workspace scope, following the host window must not restart the
  // conversation — it is the same one.
  const setter = methodBody(chat, "setScopedFolderNid");
  assert.match(
    setter,
    /if \(this\.mget\("scope"\) === "workspace"\)[\s\S]*?return;/,
    "workspace scope must return before the list restart",
  );
});

test("a DMZ share stays folder-scoped — it is an access boundary", () => {
  // This is the assertion that matters most in this file. A share recipient
  // was given ONE folder; reading the hub would be an exposure, not a nicety.
  assert.match(
    toolkit,
    /const sharedView\s*=\s*\n?\s*ui\.fig\.family === "dmz-sharebox" \|\| !!ui\.mget\(_a\.token\)/,
    "a sharebox, or a folder window carrying a share token, is a shared view",
  );
  assert.match(
    toolkit,
    /chat\.scope\s*=\s*sharedView \? _a\.folder : "workspace"/,
    "shared views keep folder scope; only a member's workspace chat widens",
  );

  // The file-thread side panel falls back to the same split when its file
  // scope is cleared, so it must not widen a share either.
  assert.match(
    toolkit,
    /scope:\s*ui\.mget\(_a\.token\) \? _a\.folder : "workspace"/,
    "the file-thread panel must apply the same rule",
  );
});

test("the calendar folds the old 'folder' scope into 'workspace'", () => {
  const helpers = read("builtins/panel/calendar/skeleton/helpers.js");
  // A server predating the rename sends 'folder' for exactly the same rows.
  // Left unfolded they fall through every `=== "workspace"` test as an unknown
  // third value and render wrong.
  assert.match(
    helpers,
    /rawScope === "folder" \? "workspace" : rawScope/,
    "'folder' must be read as a synonym of 'workspace'",
  );

  // The pill's CSS must still match the legacy value, or those rows lose their
  // background.
  const skin = readFileSync(
    join(SRC, "builtins/panel/calendar/skin/index.scss"),
    "utf8",
  );
  assert.match(skin, /&\[data-scope="workspace"\],\s*\n\s*&\[data-scope="folder"\]/);
});
