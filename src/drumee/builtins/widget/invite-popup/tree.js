/**
 * The "Invite to" tree: which workspaces may be offered, how they group under
 * departments, and what each checkbox shows. Pure — no globals, no DOM — so
 * the selection rules are tested without a browser.
 *
 * THE OFFERABLE SET IS desk.home, NOT THE ORG LIST. organization.overview
 * returns every workspace in the domain, including ones this caller holds no
 * admin bit in, and hub.invite is `src: admin` — offering those would only
 * produce a 403 on Send. The org list is used for GROUPING and member counts,
 * never to add a row.
 */
const ADMIN = 0b0011111;

// Areas that are NOT user-invitable workspaces:
//   - personal: each user's home space, owned by them
//   - system / pool / pool/dmz / template / dummy: infra
//   - dmz / dmz-public / dmz-private: one-shot share buckets, not workspaces
// Everything else (private, restricted, share, public, limited) is a
// collaborative workspace the admin can invite into.
const NON_INVITEABLE = new Set([
  "personal", "system", "pool", "pool/dmz", "template", "dummy",
  "dmz", "dmz-public", "dmz-private",
]);

const idOf = (r) => String(r.hub_id || r.id || r.actual_hub_id || "");

// A list service with exactly one row answers with the object itself.
const asRows = (r) => (r == null ? [] : Array.isArray(r) ? r : [r]);

/**
 * @param {Array|Object} rows desk.home rows (or the single-row object)
 * @returns {Array} the rows this caller may invite into
 */
function inviteable(rows) {
  return asRows(rows).filter(
    (w) =>
      w &&
      idOf(w) &&
      // desk.home returns hubs whose ENTITY is deleted or frozen with that
      // status (see desk _fetchWorkspaces). Allow-list active; a missing
      // status still passes, as it does in the desk switcher.
      (!w.status || w.status === "active") &&
      ((w.privilege | 0) & ADMIN) === ADMIN &&
      !NON_INVITEABLE.has(w.area || ""),
  );
}

/**
 * @param {{homeRows: Array, overview: Object}} src desk.home rows and an
 *   orgOverview() result
 * @returns {{departments: Array, ungrouped: Array}} departments that hold at
 *   least one invitable workspace, then the workspaces no department holds
 */
function buildTree({ homeRows, overview }) {
  const org = overview || {};
  // Reported by the server, never inferred: a caller below dom_admin_security
  // must not be shown departments even if a stale answer carried some.
  const browse = !!org.can_browse;
  const orgWs = new Map();
  for (const w of (browse && org.workspaces) || []) orgWs.set(String(w.hub_id), w);

  const departments = ((browse && org.departments) || []).map((d) => ({
    id: String(d.id),
    name: d.name || "",
    workspaces: [],
  }));
  const byDept = new Map(departments.map((d) => [d.id, d]));
  const ungrouped = [];

  for (const row of inviteable(homeRows)) {
    const hub_id = idOf(row);
    const o = orgWs.get(hub_id);
    const department_id =
      o && o.department_id != null ? String(o.department_id) : null;
    const ws = {
      hub_id,
      name: row.filename || row.name || "",
      area: row.area || "",
      members: o && o.members != null ? Number(o.members) : null,
      department_id,
    };
    const dept = department_id && byDept.get(department_id);
    if (dept) dept.workspaces.push(ws);
    else ungrouped.push({ ...ws, department_id: null });
  }
  return { departments: departments.filter((d) => d.workspaces.length), ungrouped };
}

/**
 * UI mock for development builds (see the controller's gate): an organisation
 * with no departments yet still shows the department rows, so the design can
 * be exercised on a stage endpoint. Built from the caller's REAL invitable
 * workspaces — at most two mock departments of two — so every checkbox still
 * maps to a real hub and Send invites exactly what it would without the mock.
 *
 * Returns the input untouched when there is nothing to mock: a tree with real
 * departments, or no workspace at all.
 *
 * @param {{departments: Array, ungrouped: Array}} tree buildTree() result
 * @returns {{departments: Array, ungrouped: Array}}
 */
function withMockDepartments(tree) {
  if (tree.departments.length || !tree.ungrouped.length) return tree;
  const rest = tree.ungrouped.slice();
  const departments = [];
  for (let i = 1; i <= 2 && rest.length; i++) {
    const id = `mock-${i}`;
    departments.push({
      id,
      name: `Department ${String.fromCharCode(64 + i)} (mock)`,
      mock: 1,
      workspaces: rest.splice(0, 2).map((w) => ({ ...w, department_id: id })),
    });
  }
  return { departments, ungrouped: rest };
}

function allHubIds(tree) {
  return [...tree.departments.flatMap((d) => d.workspaces), ...tree.ungrouped].map(
    (w) => w.hub_id,
  );
}

function deptOf(tree, hub_id) {
  const id = String(hub_id);
  const d = tree.departments.find((x) => x.workspaces.some((w) => w.hub_id === id));
  return d ? d.id : null;
}

function stateOf(ids, checked) {
  if (!ids.length) return 0;
  const n = ids.filter((id) => checked.has(id)).length;
  return n === 0 ? 0 : n === ids.length ? 1 : "mixed";
}

/** @returns {0|1|"mixed"} */
const deptState = (dept, checked) =>
  stateOf(dept.workspaces.map((w) => w.hub_id), checked);

/** @returns {0|1|"mixed"} */
const allState = (tree, checked) => stateOf(allHubIds(tree), checked);

function toggleWorkspace(checked, hub_id) {
  const out = new Set(checked);
  const id = String(hub_id);
  if (out.has(id)) out.delete(id);
  else out.add(id);
  return out;
}

function setMany(checked, ids, on) {
  const out = new Set(checked);
  for (const id of ids) {
    if (on) out.add(id);
    else out.delete(id);
  }
  return out;
}

// Empty or mixed → check all of it; full → clear only its own workspaces.
const toggleDept = (dept, checked) =>
  setMany(checked, dept.workspaces.map((w) => w.hub_id), deptState(dept, checked) !== 1);

const toggleAll = (tree, checked) =>
  setMany(checked, allHubIds(tree), allState(tree, checked) !== 1);

module.exports = {
  ADMIN,
  inviteable,
  buildTree,
  withMockDepartments,
  allHubIds,
  deptOf,
  deptState,
  allState,
  toggleWorkspace,
  toggleDept,
  toggleAll,
};
