/**
 * The name THIS desk gives a workspace.
 *
 * A workspace's shared name (yp.hub.name / profile.name) is what the server
 * puts in a meeting push as `hub_name`. A rename from the desk only writes the
 * user's own hub node, never that shared name, so a push could name a
 * workspace the user no longer sees anywhere on their desk ("V started a
 * meeting in <the name it was created with>"). The desk's cached workspace
 * list holds the user's own label; a hub row's nid is the hub id.
 */

/**
 * @param {string} hubId
 * @returns {string} the desk's label, or '' when the desk has not loaded it
 */
function ownWorkspaceName(hubId) {
  if (typeof Desk === "undefined" || !Desk || !hubId) return "";
  const row = (Desk._workspaces || []).find(
    (r) => r && r.filetype === _a.hub && `${r.nid}` === `${hubId}`,
  );
  return (row && row.filename) || "";
}

/**
 * A copy of a meeting payload whose `hub_name` is this desk's label. The
 * payload itself is returned when the desk has no label for the workspace.
 *
 * @param {Object} data
 * @returns {Object}
 */
function withOwnWorkspaceName(data) {
  if (!data || !data.hub_id) return data;
  const name = ownWorkspaceName(data.hub_id);
  return name ? { ...data, hub_name: name } : data;
}

module.exports = { ownWorkspaceName, withOwnWorkspaceName };
