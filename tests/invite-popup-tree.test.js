// The invite popup's "Invite to" tree: which workspaces are offered, how they
// group under departments, and the tri-state checkbox rules. Pure module.
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const T = require(path.join(__dirname, "..", "src/drumee/builtins/widget/invite-popup/tree.js"));

const ADMIN = 0b0011111;
const home = [
  { hub_id: "h1", filename: "Design", area: "private", privilege: ADMIN },
  { hub_id: "h2", filename: "Sales", area: "restricted", privilege: ADMIN },
  { hub_id: "h3", filename: "Loose", area: "share", privilege: ADMIN },
  { hub_id: "h4", filename: "Viewer", area: "private", privilege: 0b0000011 },
  { hub_id: "me", filename: "Home", area: "personal", privilege: ADMIN },
  { id: "h5", name: "Dmz", area: "dmz", privilege: ADMIN },
];
const overview = {
  can_browse: 1,
  departments: [{ id: 10, name: "Product" }, { id: 11, name: "Empty" }],
  workspaces: [
    { hub_id: "h1", department_id: 10, members: 24 },
    { hub_id: "h2", department_id: 10, members: 3 },
    { hub_id: "h4", department_id: 10, members: 9 },
    { hub_id: "h9", department_id: 10, members: 1 },
    { hub_id: "h3", department_id: null, members: 2 },
  ],
};

test("inviteable keeps admin hubs in collaborative areas only", () => {
  assert.deepEqual(T.inviteable(home).map((r) => r.hub_id || r.id), ["h1", "h2", "h3"]);
});

test("drops org workspaces the caller cannot administer", () => {
  const t = T.buildTree({ homeRows: home, overview });
  assert.deepEqual(T.allHubIds(t).sort(), ["h1", "h2", "h3"]);
});

test("groups by department, drops empty departments, ungrouped last", () => {
  const t = T.buildTree({ homeRows: home, overview });
  assert.deepEqual(t.departments.map((d) => [d.id, d.name, d.workspaces.map((w) => w.hub_id)]), [["10", "Product", ["h1", "h2"]]]);
  assert.deepEqual(t.ungrouped.map((w) => w.hub_id), ["h3"]);
  assert.equal(t.departments[0].workspaces[0].members, 24);
  assert.equal(t.departments[0].workspaces[0].name, "Design");
});

test("no organisation: flat list, members null", () => {
  const t = T.buildTree({ homeRows: home, overview: { can_browse: 0, departments: [], workspaces: [] } });
  assert.equal(t.departments.length, 0);
  assert.deepEqual(t.ungrouped.map((w) => [w.hub_id, w.members]), [["h1", null], ["h2", null], ["h3", null]]);
});

test("a caller who may not browse gets no departments even if sent some", () => {
  const t = T.buildTree({ homeRows: home, overview: { ...overview, can_browse: 0 } });
  assert.equal(t.departments.length, 0);
  assert.equal(t.ungrouped.length, 3);
});

test("deptOf finds the department of a seeded hub", () => {
  const t = T.buildTree({ homeRows: home, overview });
  assert.equal(T.deptOf(t, "h2"), "10");
  assert.equal(T.deptOf(t, "h3"), null);
});

test("tri-state: department and All", () => {
  const t = T.buildTree({ homeRows: home, overview });
  const d = t.departments[0];
  assert.equal(T.deptState(d, new Set()), 0);
  assert.equal(T.deptState(d, new Set(["h1"])), "mixed");
  assert.equal(T.deptState(d, new Set(["h1", "h2"])), 1);
  assert.equal(T.allState(t, new Set(["h1", "h2"])), "mixed");
  assert.equal(T.allState(t, new Set(["h1", "h2", "h3"])), 1);
  assert.equal(T.allState({ departments: [], ungrouped: [] }, new Set()), 0);
});

test("clicking a mixed department checks all of it", () => {
  const t = T.buildTree({ homeRows: home, overview });
  const out = T.toggleDept(t.departments[0], new Set(["h1", "h3"]));
  assert.deepEqual([...out].sort(), ["h1", "h2", "h3"]);
});

test("clicking a full department clears only its workspaces", () => {
  const t = T.buildTree({ homeRows: home, overview });
  const out = T.toggleDept(t.departments[0], new Set(["h1", "h2", "h3"]));
  assert.deepEqual([...out], ["h3"]);
});

test("toggleAll checks everything unless everything is checked", () => {
  const t = T.buildTree({ homeRows: home, overview });
  assert.deepEqual([...T.toggleAll(t, new Set(["h1"]))].sort(), ["h1", "h2", "h3"]);
  assert.equal(T.toggleAll(t, new Set(["h1", "h2", "h3"])).size, 0);
});

// desk.home returns hubs whose ENTITY is deleted or frozen with status
// "deleted"/"frozen" (see desk _fetchWorkspaces); "All" must never select one.
test("inviteable drops non-active hubs, keeps rows with no status", () => {
  const rows = [
    { hub_id: "x1", area: "private", privilege: ADMIN, status: "active" },
    { hub_id: "x2", area: "private", privilege: ADMIN, status: "deleted" },
    { hub_id: "x3", area: "private", privilege: ADMIN, status: "frozen" },
    { hub_id: "x4", area: "private", privilege: ADMIN },
  ];
  assert.deepEqual(T.inviteable(rows).map((r) => r.hub_id), ["x1", "x4"]);
});

// A list service with exactly one row answers with the object itself.
test("a single-object desk.home answer is one row, not none", () => {
  const one = { hub_id: "h1", filename: "Solo", area: "private", privilege: ADMIN };
  assert.deepEqual(T.inviteable(one).map((r) => r.hub_id), ["h1"]);
  const t = T.buildTree({ homeRows: one, overview: null });
  assert.deepEqual(T.allHubIds(t), ["h1"]);
});

test("toggles never mutate their input", () => {
  const before = new Set(["h1"]);
  T.toggleWorkspace(before, "h2");
  assert.deepEqual([...before], ["h1"]);
});

// UI mock for development builds: an org with no departments still shows the
// department rows, built from the caller's REAL workspaces (so Send still
// invites into real hubs). Never replaces real departments.
test("withMockDepartments groups real workspaces under two mock departments", () => {
  const t = T.buildTree({ homeRows: home, overview: { can_browse: 0 } });
  const m = T.withMockDepartments(t);
  assert.deepEqual(m.departments.map((d) => [d.id, d.mock, d.workspaces.map((w) => w.hub_id)]),
    [["mock-1", 1, ["h1", "h2"]], ["mock-2", 1, ["h3"]]]);
  assert.deepEqual(m.ungrouped, []);
  assert.deepEqual(T.allHubIds(m).sort(), ["h1", "h2", "h3"]);
  assert.equal(t.departments.length, 0, "input tree untouched");
});

test("withMockDepartments leaves the rest ungrouped past four workspaces", () => {
  const rows = ["a", "b", "c", "d", "e"].map((id) => ({ hub_id: id, filename: id, area: "private", privilege: ADMIN }));
  const m = T.withMockDepartments(T.buildTree({ homeRows: rows, overview: null }));
  assert.deepEqual(m.departments.map((d) => d.workspaces.length), [2, 2]);
  assert.deepEqual(m.ungrouped.map((w) => w.hub_id), ["e"]);
});

test("withMockDepartments never touches real departments or an empty tree", () => {
  const real = T.buildTree({ homeRows: home, overview });
  assert.equal(T.withMockDepartments(real), real);
  const empty = { departments: [], ungrouped: [] };
  assert.equal(T.withMockDepartments(empty), empty);
});
