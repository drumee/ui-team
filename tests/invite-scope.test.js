// Which invite popup the desk opens: the workspace-scoped one only for the
// sidebar's Invite row inside a real, named workspace; the org popup otherwise.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const { inviteWorkspaceScope } = require(path.join(__dirname, "..", "src/drumee/libs/invite-scope.js"));

const sidebar = { mget: (k) => (k === "sys_pn" ? "sidebar-invite" : undefined) };
const topbar = { mget: () => undefined };
const rows = [{ hub_id: "h1", filename: "Design", area: "share" }];
const base = { cmd: sidebar, ws: { hub_id: "h1", area: "private" }, rows, visitorId: "me", wmName: "" };

test("sidebar row in a named workspace → workspace scope, name + area from its row", () => {
  assert.deepEqual(inviteWorkspaceScope(base), { scope: "workspace", hub_name: "Design", hub_area: "share" });
});

test("not in the cached rows → the window manager's name, the workspace's own area", () => {
  assert.deepEqual(inviteWorkspaceScope({ ...base, rows: [], wmName: "Deep link" }),
    { scope: "workspace", hub_name: "Deep link", hub_area: "private" });
});

test("topbar / context menu / tours keep the org popup", () => {
  assert.deepEqual(inviteWorkspaceScope({ ...base, cmd: topbar }), {});
  assert.deepEqual(inviteWorkspaceScope({ ...base, cmd: null }), {});
  assert.deepEqual(inviteWorkspaceScope({ ...base, cmd: {} }), {});
});

test("personal home, no workspace, or no name → org popup", () => {
  assert.deepEqual(inviteWorkspaceScope({ ...base, ws: { hub_id: "me" } }), {});
  assert.deepEqual(inviteWorkspaceScope({ ...base, ws: null }), {});
  assert.deepEqual(inviteWorkspaceScope({ ...base, rows: [], wmName: "" }), {});
});
