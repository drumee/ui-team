/**
 * Multi-organisation chrome: "Your organization", "Invited Organizations"
 * and "+ New organization" (B2B Org Structure, Figma 900:150849 / 900:150993).
 *
 * The data model keeps one PRIMARY organisation per person (yp.privilege
 * UNIQUE uid, drumate.domain_id) and adds the others in yp.org_membership.
 * Each organisation is still its own subdomain, so switching is navigating to
 * that organisation's address: the server (service/lib/active-org.js) makes
 * every request there act in it, and get_env reports it as Organization so
 * the router no longer sends the person home.
 *
 * On whenever the server ships the listing (organization.my_orgs); a server
 * without it keeps the panel exactly as before.
 */
function multiOrgEnabled() {
  return !!(window.SERVICE && SERVICE.organization && SERVICE.organization.my_orgs);
}

/**
 * Drop a skeleton entry unless multi-org is on. Takes a THUNK so a gated row
 * is never built while it is off; `null` entries are filtered by feed/kids.
 *
 * @param {Function} build
 * @returns {Object|null}
 */
function multiOrgOnly(build) {
  return multiOrgEnabled() ? build() : null;
}

module.exports = { multiOrgEnabled, multiOrgOnly };
