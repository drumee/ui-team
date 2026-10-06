/**
 * The folders at the open folder's level, for the topbar switcher.
 *
 * When the desk address is deeper than the workspace (`aaaa / abc`), the
 * switcher under the caret lists abc's siblings — the folders inside its
 * parent — instead of the workspaces. Pure: no globals, so node --test can
 * run it, and the desk/breadcrumb only wire it in.
 *
 * `type: "node"`, NOT "folder": media.show_node_by allow-lists its types
 * (server-team/service/media.js show_node_by) and "folder" is not one, so it
 * fell back to "all" and files ate the 45-row page. "node" is folders + hubs
 * (mfs_show_node_by), and siblingFolders drops the hubs.
 */
const FOLDER = "folder";
const HUB = "hub";
// mfs_show_node_by pages through pageToLimits: (page-1)*45, 45. Hard.
const PAGE_SIZE = 45;
const MAX_PAGES = 20;

// A workspace root reached through get_path can carry its real root as
// actual_home_id — the same normalisation desk_breadcrumb._onBrowse applies.
function nodeNid(row) {
  if (!row) return null;
  if (row.filetype === HUB && row.actual_home_id) return row.actual_home_id;
  return row.nid || null;
}

function displayName(row) {
  if (!row) return "";
  const f = row.filename;
  if (f && f !== "/") return f;
  return row.hub_name || row.name || "";
}

/**
 * @param {Array<Object>} path raw get_path rows, root first (desk_breadcrumb._data)
 * @returns {Object|null} null when the address is the workspace alone
 */
function siblingScope(path) {
  if (!Array.isArray(path) || path.length < 2) return null;
  const parent = path[path.length - 2];
  const current = path[path.length - 1];
  const hub_id = (current && current.hub_id) || (parent && parent.hub_id);
  const parentNid = nodeNid(parent);
  const currentNid = nodeNid(current);
  if (!hub_id || !parentNid || !currentNid) return null;
  return {
    hub_id,
    parentNid,
    currentNid,
    parentName: displayName(parent),
    area: (current && current.area) || (parent && parent.area) || "",
    key: `${hub_id}:${parentNid}`,
  };
}

// A list service with one row answers with the row itself.
function asRows(r) {
  if (r == null) return [];
  if (Array.isArray(r)) return r;
  for (const k of ["data", "list", "rows", "result"]) {
    if (Array.isArray(r[k])) return r[k];
  }
  return typeof r === "object" ? [r] : [];
}

/**
 * Folders only, and only live ones. A MISSING status passes, as in the
 * workspace switcher: an over-full menu beats an empty one.
 */
function siblingFolders(rows) {
  return asRows(rows).filter(
    (it) =>
      it &&
      (it.filetype === FOLDER || it.type === FOLDER) &&
      (!it.status || it.status === "active"),
  );
}

/**
 * @param {Function} fetch (params) => Promise — media.show_node_by
 * @param {Object} scope from siblingScope
 * @param {Object} [opts] { now } — injectable clock for the cache-buster
 */
async function fetchSiblingFolders(fetch, scope, opts = {}) {
  const now = opts.now || Date.now;
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const rows = asRows(
      await fetch({
        hub_id: scope.hub_id,
        nid: scope.parentNid,
        type: "node",
        page,
        // fetchService is an HTTP-cached GET; a folder created since the last
        // open would otherwise be missing.
        _ts: now(),
      }),
    );
    if (!rows.length) break;
    all.push(...rows);
    if (rows.length < PAGE_SIZE) break;
  }
  return siblingFolders(all);
}

module.exports = {
  siblingScope,
  siblingFolders,
  fetchSiblingFolders,
  PAGE_SIZE,
  MAX_PAGES,
};
