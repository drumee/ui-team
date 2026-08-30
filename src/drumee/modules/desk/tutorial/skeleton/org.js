/**
 * Organisations and departments are not implemented yet.
 *
 * The 2.0 frames draw three org affordances the tour would otherwise have to
 * teach — the topbar's "Org-name / Business" chip, the "Department-name /"
 * breadcrumb segment, and the rail's "Dept." entry. Showing them would teach a
 * UI that does not exist; deleting them would make the tour hard to restore
 * when org lands.
 *
 * So they are composed, and gated on one flag. Flip this to true and the three
 * sites come back together.
 */
const ORG_ENABLED = false;

/** @returns {Boolean} whether org/department chrome should be rendered */
function orgEnabled() {
  return ORG_ENABLED;
}

/**
 * Drop a skeleton entry unless org is on.
 *
 * `null` entries are filtered by `feed`/`kids`, so a gated row costs nothing
 * at render — the composers stay linear instead of branching around it.
 *
 * Takes a THUNK, not a node: a gated row may name an icon or a locale key
 * that only exists once org ships, and a thunk means that row is never even
 * built while the flag is off.
 *
 * @param {Function} build
 * @returns {Object|null}
 */
function orgOnly(build) {
  return ORG_ENABLED ? build() : null;
}

module.exports = { orgEnabled, orgOnly };
