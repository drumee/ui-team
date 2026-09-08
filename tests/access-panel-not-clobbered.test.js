// Inviting from "Who has access" turned the drawer into the legacy "Folder
// Setting" panel — Download / Rename / Organize / Duplicate / Delete rows and
// all (reported 2026-09-08 with a screenshot).
//
// window/folder's `dialogWrapper` and its `isShowSettings` flag are shared by
// THREE panels: the Folder Settings panel, `permission_restricted` and
// `window_secure_share`. The flag only ever meant "some drawer is open", but
// the member refreshers read it as "the Folder Settings panel is open" and
// re-fed that skeleton over whatever was actually there. The server's
// `hub.member_joined` push — added so an admin watching the matrix sees a new
// member without reloading — is what triggered it mid-invite.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const FOLDER = join(__dirname, "..", "src/drumee/builtins/window/folder/index.js");
const PANEL = join(__dirname, "..", "src/drumee/builtins/permission/restricted/index.js");

// Lift a method body out of a class so it runs against a stub `this`.
// `sync` matters: _folderSettingsPanelIsOpen is a plain predicate, and wrapping
// it as async would hand its callers a Promise — always truthy, which is
// exactly the guard being tested.
function lift(file, signature, globals = {}, sync = false) {
  const src = readFileSync(file, "utf8");
  const m = src.match(
    new RegExp(`\\n {2}(?:async )?${signature.replace(/[()]/g, "\\$&")} \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`),
  );
  assert.ok(m, `${signature} not found`);
  const names = Object.keys(globals);
  const args = signature.slice(signature.indexOf("(") + 1, signature.lastIndexOf(")"));
  return new Function(
    ...names,
    `return ${sync ? "" : "async "}function (${args}) {\n${m[1]}\n};`,
  )(...names.map((n) => globals[n]));
}

// Stands in for `require("./skeleton/settings-action-panel")(this)` — the
// folder window calls the module it loads, so the stub must return a function.
const requireStub = () => () => ({ kind: "settings-action-panel" });

// A folder window whose drawer holds `panelClass`, or nothing.
function folderWindow(panelClass) {
  const el = {
    querySelector: (sel) =>
      panelClass && sel === `.${panelClass}` ? { tag: "panel" } : null,
  };
  return {
    fig: { family: "window-folder" },
    isShowSettings: !!panelClass,
    dialogWrapper: panelClass ? { el, feeds: 0, feed() { this.feeds += 1; } } : null,
  };
}

const HUB_SVC = { hub: { get_members_by_type: "hub.get_members_by_type" } };
const SETTINGS = "window-folder__settings-action-panel";
const isOpen = () => lift(FOLDER, "_folderSettingsPanelIsOpen()", {}, true);

test("the drawer holding the Folder Settings panel is recognised", () => {
  assert.equal(isOpen().call(folderWindow(SETTINGS)), true);
});

test("the drawer holding 'Who has access' is NOT the settings panel", () => {
  // permission_restricted renders its own prefix, never the settings root.
  assert.equal(isOpen().call(folderWindow("permission-restricted__main")), false);
});

test("a closed drawer is not the settings panel", () => {
  assert.equal(isOpen().call(folderWindow(null)), false);
});

test("isShowSettings alone is not enough — that was the bug", () => {
  // openManageAccess sets the SAME flag when it feeds the access drawer.
  const w = folderWindow("permission-restricted__main");
  assert.equal(w.isShowSettings, true);
  assert.equal(isOpen().call(w), false);
});

test("a live member_joined does NOT re-feed a drawer showing another panel", async () => {
  const refresh = lift(FOLDER, "_refreshFolderMembers()", { require: requireStub, SERVICE: HUB_SVC });
  const w = folderWindow("permission-restricted__main");
  w._folderSettingsPanelIsOpen = isOpen();
  w.actualNode = () => ({ hub_id: "h1" });
  w.fetchService = () => assert.fail("must not refetch for a foreign panel");

  await refresh.call(w);
  assert.equal(w.dialogWrapper.feeds, 0);
});

test("a live member_joined DOES refresh the Folder Settings panel", async () => {
  const refresh = lift(FOLDER, "_refreshFolderMembers()", { require: requireStub, SERVICE: HUB_SVC });
  const w = folderWindow(SETTINGS);
  w._folderSettingsPanelIsOpen = isOpen();
  w.actualNode = () => ({ hub_id: "h1" });
  w.fetchService = () => Promise.resolve([{ entity_id: "u1" }]);

  await refresh.call(w);
  assert.equal(w.dialogWrapper.feeds, 1);
  assert.deepEqual(w._folderMembers, [{ entity_id: "u1" }]);
});

// ── the other half: the access panel now refreshes itself ──────────────────

const accessPanel = (hubId) => ({
  _members: [{ entity_id: "u1", email: "owner@x" }],
  loads: 0,
  mget: (k) => (k === "hub_id" ? hubId : undefined),
  _loadMembers() {
    this.loads += 1;
  },
});

const onWs = () => lift(PANEL, "_onWsEvent(args = {})", { _a: { hub_id: "hub_id" } });

test("hub.member_joined on this workspace reloads the matrix", async () => {
  const p = accessPanel("h1");
  await onWs().call(p, { data: { hub_id: "h1", uid: "u2" }, options: { service: "hub.member_joined" } });
  assert.equal(p.loads, 1);
});

test("a member_joined for a different workspace is ignored", async () => {
  const p = accessPanel("h1");
  await onWs().call(p, { data: { hub_id: "h2" }, options: { service: "hub.member_joined" } });
  assert.equal(p.loads, 0);
});

test("unrelated pushes are ignored", async () => {
  const p = accessPanel("h1");
  await onWs().call(p, { data: { hub_id: "h1" }, options: { service: "media.new" } });
  await onWs().call(p, { data: { hub_id: "h1" } });
  assert.equal(p.loads, 0);
});

test("a failed refresh leaves the matrix it already had", async () => {
  const load = lift(PANEL, "_loadMembers()", { _a: { hub_id: "hub_id" }, SERVICE: HUB_SVC });
  const kept = [{ entity_id: "u1" }, { entity_id: "u2" }];
  const p = {
    _members: kept,
    mget: () => "h1",
    warn() {},
    _render() {},
    _reveal() {},
    fetchService: () => Promise.reject(new Error("offline")),
  };
  await load.call(p);
  assert.deepEqual(p._members, kept);
});
