/**
 * Switching organisation without leaving the page.
 *
 * The dropdown used to call uiRouter.changeHost(link). That works -- the
 * session cookie is written on main_domain so it spans every org subdomain and
 * nobody has to sign in again -- but it is a full page load, and it never
 * actually switched anything: session_check_cookie resolves the session's
 * domain from drumate.domain_id, which is HOME, with no reference to the Host
 * at all. Changing host changed which vhost bootstrapped and nothing else.
 * With one org per person the difference was invisible.
 *
 * WHAT A SWITCH ACTUALLY IS, then: tell the server which organisation to
 * answer for, and re-seed the three globals the whole SPA reads. The server
 * side is service/lib/acting-domain.js; this is the client half.
 *
 * THE PRECEDENT IS ALREADY IN THE TREE. promo-launch30's
 * _refreshSessionAfterClaim re-fetches yp.get_env and re-seeds Visitor /
 * Organization / Host to mirror init_globals, for exactly the same reason --
 * the boot globals go stale after the server's answer changes underneath them.
 * A switch is that operation with a different cause.
 *
 * TWO THINGS NAVIGATE THE BROWSER IF LEFT ALONE, and both have to be told not
 * to. ui-core's Organization.listenChanges() calls changeHost on ANY change
 * carrying a `link`, and the router re-syncs the host on EVERY route when
 * location.host stops matching Organization.host(). Both enforce an invariant
 * -- the host names the org -- that in-place switching deliberately abandons,
 * so both consult the flag this module sets. Note {silent: true} is not an
 * alternative: org-tab listens on the same change event to repaint itself.
 *
 * WHY sessionStorage AND NOT localStorage. A switch belongs to a tab. The desk
 * makes the same choice for the same reason (see _DESK_STATE_KEY): a reload of
 * THIS tab restores, a brand-new tab starts at home, and two tabs left in two
 * different organisations never overwrite each other. localStorage is
 * browser-global and would make the second tab follow the first.
 *
 * The key is per-user, following libs/tutorial-tours' mirrorKey: signing out
 * and back in as somebody else in the same tab must not inherit a stale org.
 */

const { xhRequest } = require("@drumee/ui-essentials");

const PREFIX = "drumee.org.acting";

/**
 * Per-user, or null pre-auth -- inert rather than falling back to a fixed key,
 * which would let one account read another's.
 */
function _key() {
  try {
    const id = typeof Visitor !== "undefined" && Visitor.id;
    return id ? `${PREFIX}:${id}` : null;
  } catch (e) {
    return null;
  }
}

/** The org this tab was last acting in, or 0. */
function remembered() {
  try {
    const k = _key();
    if (!k) return 0;
    return ~~sessionStorage.getItem(k);
  } catch (e) {
    return 0;
  }
}

function remember(domainId) {
  try {
    const k = _key();
    if (!k) return;
    if (~~domainId > 1) sessionStorage.setItem(k, String(~~domainId));
    else sessionStorage.removeItem(k);
  } catch (e) { /* private mode, blocked storage: a switch just does not survive reload */ }
}

/**
 * Has this tab abandoned the host-names-the-org invariant? Read by the router
 * and by the ui-core patch, both of which would otherwise navigate away.
 *
 * Deliberately ALSO true when only a remembered org exists: after a reload the
 * globals are re-seeded from get_env before any switch has been performed in
 * this page's lifetime, and the host still names the previous org.
 */
function inPlace() {
  try {
    if (typeof Visitor === "undefined") return false;
    return !!(~~Visitor.get("org_in_place") || remembered() > 1);
  } catch (e) {
    return false;
  }
}

/**
 * Seed the acting org from what this tab remembers, before the boot get_env
 * goes out. Called from the bootstrap so the very first request already
 * carries the header and the SPA never renders home only to be corrected.
 */
function restore() {
  const dom = remembered();
  if (dom > 1 && typeof Visitor !== "undefined") {
    Visitor.set({ acting_domain_id: dom, org_in_place: 1 });
  }
  return dom;
}

/**
 * Switch to another organisation in place.
 *
 * xhRequest rather than a widget's fetchService, so this works identically
 * from the dropdown and from the bootstrap's reload-restore path, where no
 * widget exists yet. It is the same call the bootstrap makes for get_env, and
 * it goes through makeHeaders -- which is exactly where the acting-domain
 * header is attached.
 *
 * @param {Number} domainId  the target org's domain_id
 * @returns {Promise<Boolean>} false when the server would not honour it
 */
async function switchTo(domainId) {
  const dom = ~~domainId;
  if (dom <= 1) return false;
  if (dom === ~~Visitor.get("acting_domain_id")) return true;

  const previous = ~~Visitor.get("acting_domain_id") || ~~Visitor.get(_a.domain_id);

  // Set BEFORE the fetch: defultHeaders reads acting_domain_id off Visitor, so
  // this is how the request announces where it wants to go.
  Visitor.set({ acting_domain_id: dom, org_in_place: 1 });

  let env = null;
  try {
    const r = await xhRequest(`yp.get_env`);
    if (r && r.__status == 200) env = r.data;
  } catch (e) {
    env = null;
  }

  // The server validates membership and silently answers for home when it will
  // not honour the switch, so trust its answer rather than the request: a
  // membership revoked between the dropdown rendering and the click lands here.
  const granted = env && env.organization && ~~env.organization.domain_id;
  if (!granted || granted !== dom) {
    Visitor.set({ acting_domain_id: previous > 1 ? previous : null });
    return false;
  }

  remember(dom);
  _reseed(env);
  _invalidate();
  return true;
}

/**
 * Mirror init_globals. Order matters: Organization last, because org-tab
 * repaints off its change event and should see a Visitor already carrying the
 * new privilege bitmask.
 */
function _reseed(env) {
  try {
    if (env.user) {
      // env sets user.privilege from the org row, which is what
      // Visitor.domainCan() reads -- so this is also how every permission gate
      // starts answering for the new org.
      if (Visitor.respawn) Visitor.respawn(env.user);
      else Visitor.set(env.user);
      // respawn replaces attributes wholesale; put back what identifies the switch.
      Visitor.set({ acting_domain_id: ~~env.organization.domain_id, org_in_place: 1 });
    }
    if (env.hub) Host.set(env.hub);
    if (env.organization) Organization.set(env.organization);
  } catch (e) {
    console.warn("[org-switch] re-seed failed", e);
  }
}

/**
 * Everything cached under the previous org. None of these keys carry an org,
 * because until now there was only ever one.
 */
function _invalidate() {
  try {
    require("libs/org-overview").invalidate();
  } catch (e) { }
  try {
    const overLimit = require("libs/over-limit");
    if (overLimit.reset) overLimit.reset();
  } catch (e) { }
  try {
    if (typeof RADIO_BROADCAST !== "undefined") {
      RADIO_BROADCAST.trigger("org:switched");
      RADIO_BROADCAST.trigger("org:refresh");
    }
  } catch (e) { }
}

module.exports = { switchTo, remembered, remember, restore, inPlace };
