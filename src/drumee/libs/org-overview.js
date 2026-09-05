/**
 * The organisation's own inventory — its departments, its workspaces and the
 * counts drawn beside its name — fetched once and shared.
 *
 * TWO SURFACES READ THE SAME ANSWER. The topbar chip's dropdown shows
 * "3 departments / 24 members" and the org view shows the departments those
 * numbers count; they are the same question asked from two places, and the
 * only way they can disagree is if each asks separately. So this module owns
 * the single in-flight promise and both go through it — the same argument
 * libs/workspace-target.js makes for the switcher and the home grid resolving
 * a workspace row identically.
 *
 * CACHED UNTIL SOMETHING CHANGES, not for a duration. A department is created
 * or renamed or deleted a handful of times in an organisation's life and then
 * never again, so a TTL would spend a request per interval to re-learn an
 * answer that had not moved. `invalidate()` is called by the mutations
 * themselves, which is the only moment the answer can be stale.
 *
 * NEVER THROWS. A desk whose org endpoint is missing (a deployment running an
 * older server-team than this build) must still render its topbar: a rejected
 * fetch resolves to the empty shape, which every consumer already handles as
 * "no organisation", and the failed promise is not cached so the next call
 * retries.
 */

/** The shape every consumer can render, with or without a server behind it. */
const EMPTY = {
  organisation: null,
  role: null,
  departments: [],
  workspaces: [],
  can_manage: 0,
  can_browse: 0,
};

let __pending = null;

/**
 * Is this account inside an organisation at all?
 *
 * domain 1 is the default public domain every account lands on before it buys
 * or is invited into one — the same test the billing checkout uses to decide
 * whether to collect an org name (billing/skeleton/checkout.js
 * `needsOrgBootstrap`) and the same one payment.js uses to decide whether a
 * payer can still bootstrap an org. Kept here so the chip, the view and the
 * menu row all ask it the same way rather than re-deriving it from three
 * different fields.
 *
 * THIS IS THE MAJORITY CASE, not an edge one: on stage 231 of 294 accounts
 * (79%) sit on domain 1. Everything org-shaped has to be absent for them, not
 * merely empty.
 *
 * NB it deliberately does NOT mirror the yp `my_organisation` procedure, which
 * also accepts domain 1 when the row carries `metadata.isOrganization = 1`.
 * That flag exists so the shared server domain can own branding (its name and
 * wallpaper) — on stage it makes "Drumee Stage Server" the organisation of all
 * 231 domain-1 accounts. Honouring it here would put a chip reading "Drumee
 * Stage Server" on every free user's top bar and offer them departments inside
 * a domain they do not own. billing and payment both draw the line at
 * domain_id > 1; so does this.
 *
 * @returns {Boolean}
 */
function inOrganization() {
  return ~~Visitor.get("domain_id") > 1;
}

/**
 * Should any organisation chrome be rendered at all?
 *
 * TWO INDEPENDENT REASONS IT MAY NOT BE, and both must be absent-not-empty:
 *
 *   1. the account has no organisation (domain 1) — see inOrganization();
 *   2. the SERVER does not implement the endpoints yet.
 *
 * (2) is a real state, not a hypothetical: `SERVICE` is
 * `_.merge({}, localServices, platformServices)` and platformServices is
 * generated from the server's registered ACL modules (Acl.getServices), so a
 * deployment running a server-team without `acl/organization.json` simply has
 * no `SERVICE.organization`. That is exactly how `SERVICE.desk.cta_click` is
 * guarded in widget/help/main, and it is why the org services are NOT declared
 * in the client's own lex/services.json: declaring them there would make this
 * check pass on every deployment and defeat itself.
 *
 * Without this the failure is quiet and worse than an error: the chip would
 * render (its name and plan come from the boot payload, so they look right)
 * over a dropdown reporting "0 departments, 0 members" and an Open button
 * leading to an empty screen — stating as fact something it never learned.
 *
 * @returns {Boolean}
 */
function orgFeature() {
  return (
    inOrganization()
    && typeof SERVICE !== "undefined"
    && !!(SERVICE.organization && SERVICE.organization.overview)
  );
}

/**
 * Normalise one overview payload.
 *
 * A list service that matched exactly one row answers `{...}` rather than
 * `[{...}]`, so `departments` can arrive as a bare object for an organisation
 * with a single department. The server already flattens this, but the client
 * cannot assume which server it is talking to — an older endpoint, or a
 * hand-rolled payload in a test, would otherwise silently render nothing.
 *
 * @param {Object} data
 * @returns {Object}
 */
function normalize(data) {
  if (!data) return { ...EMPTY };
  const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
  return {
    organisation: data.organisation || null,
    // 'owner' | 'admin' | 'member', decided server-side from yp.privilege.
    role: data.role || null,
    departments: list(data.departments),
    workspaces: list(data.workspaces),
    can_manage: ~~data.can_manage,
    // Reported, never inferred from `departments.length`: a member is sent an
    // empty list because they may not see one, which is a different state from
    // an organisation that has no departments yet, and the two must not render
    // alike.
    can_browse: ~~data.can_browse,
  };
}

/**
 * Fetch (or reuse) the overview.
 *
 * @param {Object} view any widget — supplies fetchService's auth/socket headers
 * @param {Boolean} [force] skip the cache, e.g. straight after a mutation
 * @returns {Promise<Object>} always resolves; never rejects
 */
function orgOverview(view, force) {
  if (force) __pending = null;
  if (__pending) return __pending;

  if (!orgFeature()) {
    // Resolved, but NOT cached: an account can acquire an organisation
    // mid-session (the checkout webhook provisions one and the desk reloads),
    // and a cached "no" would outlive that.
    return Promise.resolve({ ...EMPTY });
  }

  __pending = view
    .fetchService(SERVICE.organization.overview, { hub_id: Visitor.id })
    .then(normalize)
    .catch(() => {
      __pending = null;
      return { ...EMPTY };
    });
  return __pending;
}

/**
 * Drop the cache. Call after any department mutation, then re-read.
 */
function invalidate() {
  __pending = null;
}

/**
 * Group workspaces under their departments, in the order the org view draws
 * them.
 *
 * THE UNGROUPED BUCKET IS ALWAYS LAST AND IS NOT A DEPARTMENT. Every workspace
 * that predates departments has department_id null, which is not missing data —
 * it is the bare row of cards the design puts below the last department
 * section. Returning it as a pseudo-department with an empty id would put a
 * rename pencil and a delete on something that does not exist.
 *
 * @param {Object} data an orgOverview() result
 * @returns {{sections: Array, ungrouped: Array}}
 */
function groupByDepartment(data) {
  const { departments, workspaces } = normalize(data);
  const byId = new Map();
  for (const d of departments) byId.set(String(d.id), []);

  const ungrouped = [];
  for (const w of workspaces) {
    const key = w.department_id == null ? "" : String(w.department_id);
    // A workspace pointing at a department that is no longer listed falls to
    // ungrouped rather than vanishing. That pairing should not survive
    // department_remove (it unsets the column in the same transaction), but a
    // stale client cache can still produce it, and a workspace the user cannot
    // see anywhere is worse than one in the wrong row.
    if (key && byId.has(key)) byId.get(key).push(w);
    else ungrouped.push(w);
  }

  return {
    sections: departments.map((d) => ({ department: d, workspaces: byId.get(String(d.id)) || [] })),
    ungrouped,
  };
}

module.exports = { orgOverview, invalidate, inOrganization, orgFeature, groupByDepartment, EMPTY };
