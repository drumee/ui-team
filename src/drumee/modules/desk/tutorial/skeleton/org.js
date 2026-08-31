/**
 * Organisation chrome — the topbar's "Org-name / Business" chip and the rail's
 * "Dept." entry.
 *
 * ON, because the frames the workspace tour is drawn from lead with it: the
 * org chip is the first thing at the top left of 140:22684, and the rail beside
 * it carries Dept. and nothing else (no workspace exists yet on that screen).
 * A tour that opened on a bare topbar was not the screen the design describes.
 *
 * Still a flag, and still one flag, because org is not implemented as a
 * PRODUCT: the chip names Organization.name() — which the boot payload does
 * supply — and the plan tag reads the real billing plan, but there is nothing
 * behind either of them to open. That is correct for a tour, whose whole
 * content is a mock, and wrong for anything else. Flip this to false and both
 * sites go together.
 */
const ORG_ENABLED = true;

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
