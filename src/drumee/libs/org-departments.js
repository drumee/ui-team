/* ==================================================================== *
 * The departments the viewer can see, each with its workspaces — one cached
 * read shared by the topbar's department crumb, its "Switch Departments" list
 * and the department-scoped workspace switcher (B2B Org Structure, Figma
 * 1003:172774 / 900:151850).
 *
 * NOT orgOverview. That payload is the organisation's INVENTORY and is sent
 * only to admins; the crumb is drawn for every member, so it reads
 * organization.my_departments, which answers an admin with the inventory and
 * anyone else with the departments they have a workspace in.
 * ==================================================================== */
const { orgFeature } = require("libs/org-overview");

const EMPTY = { departments: [], can_manage: 0 };

let __pending = null;

/**
 * True when this deployment serves the department read. A server that has
 * orgFeature() but not my_departments yet keeps the topbar exactly as it was.
 */
function deptFeature() {
  return (
    orgFeature()
    && !!(SERVICE.organization && SERVICE.organization.my_departments)
  );
}

/**
 * @param {Object} data
 * @returns {Object}
 */
function normalize(data) {
  if (!data) return { ...EMPTY };
  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  return {
    departments: list(data.departments).map((d) => ({
      ...d,
      workspaces: list(d.workspaces),
    })),
    can_manage: ~~data.can_manage,
  };
}

/**
 * Fetch (or reuse) the departments.
 *
 * @param {Object} view any widget — supplies fetchService's headers
 * @param {Boolean} [force] skip the cache
 * @returns {Promise<Object>} always resolves
 */
function myDepartments(view, force) {
  if (force) __pending = null;
  if (__pending) return __pending;
  if (!deptFeature()) return Promise.resolve({ ...EMPTY });

  __pending = view
    .fetchService(SERVICE.organization.my_departments, { hub_id: Visitor.id })
    .then(normalize)
    .catch(() => {
      __pending = null;
      return { ...EMPTY };
    });
  return __pending;
}

/**
 * Drop the cache — after any department mutation or workspace creation.
 */
function invalidate() {
  __pending = null;
}

/**
 * The department a workspace sits in, or null when it is ungrouped (or the
 * viewer cannot see its department).
 *
 * @param {Object} data a myDepartments() result
 * @param {String} hubId
 * @returns {Object|null}
 */
function departmentOf(data, hubId) {
  if (!data || hubId == null) return null;
  const id = String(hubId);
  return (
    data.departments.find((d) =>
      d.workspaces.some((w) => String(w.hub_id) === id),
    ) || null
  );
}

/**
 * The hub id of the workspace open right now, or null on the user's own desk
 * and in a personal (home-root folder) workspace — neither has a department.
 *
 * window.Wm, never a bare `Wm`: the topbar renders before manager.js assigns
 * the global.
 *
 * @returns {String|null}
 */
function currentHubId() {
  const cur = (window.Wm && window.Wm._curWorkspace) || null;
  if (!cur || !cur.hub_id) return null;
  if (`${cur.hub_id}` === `${Visitor.id}`) return null;
  return `${cur.hub_id}`;
}

/**
 * A department a workspace about to be created should land in — armed by the
 * department-scoped switcher's "New workspaces", consumed by the desk when the
 * create flow announces the new workspace (workspace:refresh).
 *
 * WITH A DEADLINE, for the reason the org view's own pending department has
 * one: the create dialog can be cancelled and a cancel announces nothing, so
 * an intent without an expiry would land some later, unrelated workspace in
 * this department.
 */
const PENDING_TTL = 120000;
let __pendingDept = null;

/**
 * @param {String|null} id
 */
function armPending(id) {
  __pendingDept = id ? { id, until: Date.now() + PENDING_TTL } : null;
}

/**
 * Single-shot: cleared on every read, fresh or not.
 *
 * @returns {String|null}
 */
function takePending() {
  const p = __pendingDept;
  __pendingDept = null;
  if (!p || Date.now() > p.until) return null;
  return p.id;
}

module.exports = {
  armPending,
  takePending,
  myDepartments,
  invalidate,
  deptFeature,
  departmentOf,
  currentHubId,
  EMPTY,
};
