/**
 * Multi-organisation chrome — "Switch Organizations" and "New organization".
 *
 * OFF, and off for a data-model reason rather than a UI one. In this schema an
 * organisation IS a domain, and a person belongs to exactly one:
 *
 *   yp.privilege   UNIQUE KEY (uid)          one privilege row per user
 *   yp.drumate     domain_id is a scalar     one domain per user
 *   yp.organisation UNIQUE KEY (owner_id)    one organisation per owner
 *
 * and each organisation is served from its own subdomain (yp.vhost), so
 * "switching" is not a client concern at all — it is a different host and a
 * different session. Drawing a switcher over that would list one entry that
 * cannot be left, and a "New organization" button whose insert the database
 * refuses.
 *
 * Kept as a flag rather than deleted because the design specifies both, and
 * the panel has a place reserved for them: when the membership model grows a
 * yp.org_membership (or privilege loses its UNIQUE on uid), this flips to true
 * and both sections appear together.
 *
 * Same shape and same reasoning as desk/tutorial/skeleton/org.js, which gates
 * the tour's org chrome for the same kind of reason.
 */
const MULTI_ORG_ENABLED = false;

/** @returns {Boolean} whether multi-organisation chrome should be rendered */
function multiOrgEnabled() {
  return MULTI_ORG_ENABLED;
}

/**
 * Drop a skeleton entry unless multi-org is on.
 *
 * Takes a THUNK, not a node: a gated row may name a locale key or an icon that
 * only exists once the feature ships, and a thunk means the row is never built
 * while the flag is off. `null` entries are filtered by `feed`/`kids`, so a
 * gated row costs nothing at render.
 *
 * @param {Function} build
 * @returns {Object|null}
 */
function multiOrgOnly(build) {
  return MULTI_ORG_ENABLED ? build() : null;
}

module.exports = { multiOrgEnabled, multiOrgOnly };
