/**
 * Downgrade over-limit — client-side state, one module.
 *
 * The org's over-limit block (two independent flags storage/seats, grace
 * deadline, exact overage numbers) is SERVER state: written by the yp
 * org_over_limit_* procs at every plan-lowering commit and every resolution
 * action, delivered here three ways:
 *
 *   boot   organisation.metadata.$.over_limit rides yp.get_env untouched
 *          (my_organisation returns r.*), read out of Organization;
 *   fetch  SERVICE.payment.over_limit_state — a FRESH server evaluation
 *          (opening the popup self-heals drift);
 *   push   'payment.plan_state_changed' — fan-out to every domain member
 *          after each re-evaluation.
 *
 * Widgets never compute the state; they read the derived answer here (the
 * prototype's own rule: surfaces read, they don't decide). Updates broadcast
 * on RADIO_BROADCAST "over-limit:changed" so the banner/popup re-render live
 * with no reload.
 */

const CHANGED = "over-limit:changed";

// Module-level current state — starts from boot metadata, then follows
// fetches and WS pushes. null = clean / not applicable.
let _current;
let _initialized = false;

function enforcementOn() {
  try {
    return !!(typeof Platform !== "undefined" && Platform.get && ~~Platform.get("over_limit_enforcement"));
  } catch (e) {
    return false;
  }
}

/** organisation.metadata may arrive as an object or a JSON string. */
function _bootBlock() {
  try {
    if (typeof Organization === "undefined" || !Organization.get) return null;
    let md = Organization.get("metadata");
    if (typeof md === "string") {
      try { md = JSON.parse(md); } catch (e) { md = null; }
    }
    const b = md && md.over_limit;
    if (!b || !b.state) return null;
    return {
      state: b.state,
      flags: {
        storage: ~~(b.flags && b.flags.storage),
        seats: ~~(b.flags && b.flags.seats),
      },
      grace_deadline: ~~b.grace_deadline,
      disk_used: Number(b.disk_used) || 0,
      disk_limit: Number(b.disk_limit) || 0,
      seats_used: ~~b.seats_used,
      seat_limit: ~~b.seat_limit,
      plan: b.plan || "",
      snooze: b.snooze || {},
      owner_id: b.owner_id || "",
      owner_email: b.owner_email || "",
    };
  } catch (e) {
    return null;
  }
}

/** Current derived state: null | {...block}. Lazily seeded from boot. */
function current() {
  if (!_initialized) {
    _initialized = true;
    _current = enforcementOn() ? _bootBlock() : null;
  }
  return _current;
}

/**
 * Replace the current state (from a fetch or a WS push) and tell every
 * listening surface. A payload whose state is 'ok'/absent clears the block.
 */
function setCurrent(next) {
  _initialized = true;
  // An endpoint with enforcement off never locks, whatever reaches it. UAT
  // and PROD share one DB and one Redis live-update channel, so a push fanned
  // out by an endpoint that HAS enforcement lands on sockets of one that
  // doesn't — without this gate it would lock that UI client-side while its
  // server clamp stays off. Same gate current() applies to the boot block.
  if (!enforcementOn()) {
    _current = null;
    return;
  }
  if (!next || !next.state || next.state === "ok") {
    const had = !!_current;
    _current = null;
    if (had) _broadcast();
    return;
  }
  _current = {
    state: next.state,
    flags: {
      storage: ~~(next.flags && next.flags.storage),
      seats: ~~(next.flags && next.flags.seats),
    },
    grace_deadline: ~~next.grace_deadline,
    disk_used: Number(next.disk_used) || 0,
    disk_limit: Number(next.disk_limit) || 0,
    seats_used: ~~next.seats_used,
    seat_limit: ~~next.seat_limit,
    plan: next.plan || "",
    snooze: next.snooze || (_current && _current.snooze) || {},
    // Kept across a payload that lacks them (an older server's push).
    owner_id: next.owner_id || (_current && _current.owner_id) || "",
    owner_email: next.owner_email || (_current && _current.owner_email) || "",
  };
  _broadcast();
}

function _broadcast() {
  try {
    if (typeof RADIO_BROADCAST !== "undefined") RADIO_BROADCAST.trigger(CHANGED, _current);
  } catch (e) { /* never let a listener error break the setter */ }
}

function isLocked() {
  const c = current();
  return !!(c && (c.state === "over_limit" || c.state === "hard_lock"));
}

function isHardLock() {
  const c = current();
  return !!(c && c.state === "hard_lock");
}

/** The org owner's uid: from the state, else the boot organisation row. */
function _ownerId() {
  const c = current();
  if (c && c.owner_id) return c.owner_id;
  try {
    if (typeof Organization !== "undefined" && Organization.get) {
      return Organization.get("owner_id") || "";
    }
  } catch (e) { /* none */ }
  return "";
}

/**
 * Is the viewer the org OWNER — the one person the popup's buttons and the
 * banner's "Resolve now" are for? Everyone else (admins included) is told
 * whom to contact instead. Unknown owner → falls back to isAdmin(), the
 * pre-split rule, so a missing field never hides the way out from an owner.
 */
function isOwner() {
  const owner = _ownerId();
  if (!owner) return isAdmin();
  return typeof Visitor !== "undefined" && Visitor.id === owner;
}

/** The owner's email, for the "contact the owner" line ("" when unknown). */
function ownerEmail() {
  const c = current();
  return (c && c.owner_email) || "";
}

/**
 * "Contact the owner" sentence for non-owners — popup and banner share it.
 */
function contactOwnerText() {
  const email = ownerEmail();
  return email
    ? (LOCALE.OL_CONTACT_OWNER || "Contact the workspace owner at {0} to resolve it.").format(email)
    : (LOCALE.OL_CONTACT_OWNER_NOMAIL || "Contact the workspace owner to resolve it.");
}

/** The signed-in user's org (domain) — the one whose lock this state is. */
function orgDomainId() {
  try {
    if (typeof Organization !== "undefined" && Organization.get) {
      return ~~Organization.get("domain_id");
    }
  } catch (e) { /* none */ }
  return 0;
}

/**
 * Does the lock apply to a workspace of domain `domId`? The state is the
 * USER's org's, but a user also browses workspaces of other orgs (shares)
 * and personal ones — those are not over anything. `domId` is the
 * workspace's yp.entity dom_id (media.attributes → server _withDomain).
 *
 * STRICT: an unknown domain answers false, so a click on an unidentified
 * workspace opens normally instead of raising a card that may be wrong.
 * (The banner is fail-OPEN instead — hiding a real lock there is worse.)
 */
function appliesToDomain(domId) {
  if (!enforcementOn() || !isLocked()) return false;
  const org = orgDomainId();
  if (!org || domId == null || domId === "") return false;
  return ~~domId === org;
}

/** Owner/Admin of the org — the people the popup targets and hard_lock spares. */
function isAdmin() {
  try {
    return !!(typeof Visitor !== "undefined" && Visitor.domainCan
      && Visitor.domainCan(_K.permission.admin | _K.permission.owner));
  } catch (e) {
    return false;
  }
}

/** "Remind me later" is a per-admin server-side snooze — never localStorage. */
function snoozedForMe() {
  const c = current();
  if (!c || !c.snooze) return false;
  try {
    const until = ~~c.snooze[Visitor.id];
    return until > Math.floor(Date.now() / 1000);
  } catch (e) {
    return false;
  }
}

/** Whole days remaining before the grace deadline, floored at 0. */
function daysLeft() {
  const c = current();
  if (!c || !c.grace_deadline) return 0;
  const s = c.grace_deadline - Math.floor(Date.now() / 1000);
  return Math.max(0, Math.ceil(s / 86400));
}

/**
 * Where "Resolve now" sends an Owner/Admin — shared by the top banner and the
 * popup so the two buttons can never disagree.
 *
 * Storage over → the Admin Console's Storage tab: it breaks usage down per
 * workspace and per user, which is the fastest way to find what to delete.
 * Seats only → the console's default Member tab, where Remove access lives.
 * Both flags → Storage first; the banner stays up for the seat half.
 *
 * Storage goes to the console on EVERY plan (Lexis, 2026-11-05). Free/Pro
 * have no console (libs/billing.needsAdminConsoleUpgrade), but a storage
 * overage is exactly where they need its per-workspace breakdown, so the
 * `overLimit` marker asks toggle-apps to let them through to Storage instead
 * of the upsell — see storageConsoleAllowed(). Seats-only on Free/Pro still
 * returns null and the caller falls back to its own non-console path.
 *
 * @returns {{event:String, arg?:Object}|null} a RADIO_BROADCAST to raise
 */
function resolveTarget() {
  const c = current();
  if (!c) return null;
  if (c.flags?.storage) {
    return { event: "desk:open-admin-console", arg: { tab: "storage", overLimit: 1 } };
  }
  const { needsAdminConsoleUpgrade } = require("libs/billing");
  if (needsAdminConsoleUpgrade()) return null;
  if (c.flags?.seats) return { event: "desk:open-admin-console" };
  return null;
}

/**
 * True when a plan below the console (Free/Pro) may still open the Admin
 * Console's Storage tab: the org is locked for STORAGE and the visitor is an
 * Owner/Admin. Read by the desk's toggle-apps gate, so the exception ends the
 * moment the overage is resolved — the next open is the upsell again.
 */
function storageConsoleAllowed() {
  const c = current();
  return !!(isLocked() && c.flags?.storage && isAdmin());
}

/** The message a refused write should carry, by what the user attempted. */
function blockedMessage(kind) {
  if (kind === "invite") {
    return LOCALE.OL_TOAST_INVITE
      || "Invites are paused while the workspace is over its plan limits.";
  }
  return LOCALE.OL_TOAST_READONLY
    || "This workspace is read-only until it is back within its plan limits.";
}

// One toast per burst — a multi-file drop or a double-click would otherwise
// stack the same sentence.
let _lastToastAt = 0;
// The text of the Butler notice notifyBlocked last opened, so dismissNotice
// can tell OUR notice apart from an unrelated Butler dialog it must not touch.
let _butlerMessage = null;

/**
 * Take down the read-only Butler notice if (and only if) it is ours and still
 * up. The over-limit popup calls this when it opens: it says the same thing
 * with the numbers and the way out, and the notice behind it only adds a
 * second modal and a grey scrim.
 */
function dismissNotice() {
  try {
    if (!_butlerMessage || typeof Butler === "undefined" || !Butler.el) return;
    const el = Butler.el;
    const open = el.dataset && el.dataset.state === "open";
    if (open && (el.textContent || "").includes(_butlerMessage)) {
      Butler._onClose = null;
      Butler.sleep();
    }
  } catch (e) { /* cosmetic */ }
  _butlerMessage = null;
}

/**
 * The over-limit popup is on screen. It already says the workspace is
 * read-only and how to fix it, so a refusal message on top adds nothing — and
 * Butler opens with its own 55% grey scrim (router/butler/skin), which buried
 * the popup's page-fade backdrop under a grey wash.
 */
function _popupOpen() {
  try {
    if (typeof Wm === "undefined" || !Wm.getItemsByKind) return false;
    return (Wm.getItemsByKind("over_limit_popup") || []).some(
      (w) => w && !(w.isDestroyed && w.isDestroyed())
    );
  } catch (e) {
    return false;
  }
}

/**
 * The folder window the user is looking at, or null. Front floating folder
 * window first (Wm.getActiveWindow answers Wm itself when there is none), then
 * the docked workspace pane. Null whenever a full-canvas screen (Calendar,
 * Billing, Settings…) is on top — the pane is behind it, so a notice there
 * would be invisible — and for anything not actually rendered.
 */
function _folderTarget() {
  if (typeof Wm === "undefined" || typeof document === "undefined") return null;
  const why = [];
  // GROUND TRUTH, not desk bookkeeping: the window counts only if it is what
  // the browser actually paints at the centre of its own body. A screen
  // (Calendar, Settings, Billing…) over the pane, a hidden layer, a popup in
  // front — all answer "something else is there". The first cut asked
  // desk._mainScreenOnTop() and visible rects instead, and fell back to
  // Butler on stage with the workspace plainly on screen.
  const onScreen = (w, label) => {
    if (!w || w === Wm) return why.push(`${label}:none`), false;
    if (w.isDestroyed && w.isDestroyed()) return why.push(`${label}:destroyed`), false;
    if (!w.mget || w.mget("kind") !== "window_folder") {
      return why.push(`${label}:kind=${w.mget && w.mget("kind")}`), false;
    }
    if (typeof w.showReadOnlyNotice !== "function") return why.push(`${label}:no-method`), false;
    const el = w.el;
    if (!el || !el.isConnected) return why.push(`${label}:detached`), false;
    const main = el.querySelector(".window-folder__main") || el;
    const r = main.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return why.push(`${label}:zero-size`), false;
    const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    if (!hit || !el.contains(hit)) {
      return why.push(`${label}:covered-by=${hit && (hit.className || hit.tagName)}`), false;
    }
    return true;
  };
  try {
    const active = Wm.getActiveWindow && Wm.getActiveWindow();
    if (onScreen(active, "active")) return active;
  } catch (e) { why.push(`active:threw=${e && e.message}`); }
  try {
    const pane = Wm.headlessPane && Wm.headlessPane();
    if (onScreen(pane, "pane")) return pane;
  } catch (e) { why.push(`pane:threw=${e && e.message}`); }
  try { console.info("[over-limit] notice falls back to Butler:", why.join(" | ")); } catch (e) { /* */ }
  return null;
}

function notifyBlocked(kind) {
  if (_popupOpen()) return;
  const now = Date.now();
  if (now - _lastToastAt < 2500) return;
  _lastToastAt = now;
  try {
    // In the folder window itself, not Butler's full-viewport modal: the
    // refusal belongs to what the user was doing in that window, and Butler's
    // 55% scrim greys out the whole desk for a one-line notice.
    const target = _folderTarget();
    if (target) return target.showReadOnlyNotice(blockedMessage(kind));
    // NO BUTLER FALLBACK (2026-11-05). With no folder window to host the
    // notice — a reload, a refusal before the pane exists, a full-canvas
    // screen on top — it used to open router-butler__main: a full-viewport
    // modal with a 55% scrim for a one-line message the top read-only banner
    // already carries. It surfaced at random on reload. Say nothing instead.
  } catch (e) { /* a toast must never break the action's own error path */ }
}

/**
 * UI choke-point for invite / create / upload. Returns true when the
 * action must NOT proceed (toast already shown). Call this BEFORE opening
 * a modal, spawning an editor, or hitting the server — the REST clamp is
 * the backstop, not the UX.
 *
 * @param {"invite"|"write"} [kind="write"]
 * @returns {boolean}
 */
function guardWrite(kind) {
  if (!isLocked()) return false;
  notifyBlocked(kind || "write");
  return true;
}

/**
 * Surface the server's refusals as words. The REST clamp answers a locked
 * write with 401 `OVER_LIMIT_READ_ONLY:<service>` (or HARD_LOCK_DENIED),
 * but nothing user-visible came of it — the default onServerComplain only
 * warns to the console, and most widgets bind their copy at construction,
 * so patching the prototype is bypassed (verified live: Invite while
 * locked was a button that did nothing).
 *
 * The one point every service call passes is fetch itself. The tap scopes
 * to /svc/ URLs, touches only 401s, and reads a CLONE — attached inside
 * the wrapper, its handler runs before doRequest's, so the body is still
 * unconsumed. The original promise is returned untouched; every existing
 * error path behaves exactly as before, this only adds the words.
 */
const BACKGROUND_SERVICES = new Set([
  "desk.get_env", "reward.get_state", "survey.get_state",
]);

function _installRefusalTap() {
  if (typeof window === "undefined" || !window.fetch || window.__olRefusalTap) return;
  window.__olRefusalTap = 1;
  const origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    const p = origFetch(input, init);
    try {
      const url = typeof input === "string" ? input : (input && input.url) || "";
      if (/\/svc[/?]/.test(url)) {
        p.then((res) => {
          if (!res || res.status !== 401) return;
          res.clone().json().then((j) => {
            const m = /^(OVER_LIMIT_READ_ONLY|HARD_LOCK_DENIED):(.+)$/.exec(String((j && j.error) || ""));
            // Background reads the desk makes on its own at boot — the user
            // attempted nothing, so there is nothing to tell them. Servers
            // before the allowlist fix (server-team router/rest) still refuse
            // these; that refusal is what put a "read-only" Butler modal
            // behind the over-limit popup on every load.
            if (m && BACKGROUND_SERVICES.has(m[2])) return;
            if (m) {
              notifyBlocked(/^hub\.(invite|invite_with_roles|accept_invite)/.test(m[2]) ? "invite" : "write");
            }
          }).catch(() => {});
        }).catch(() => {});
      }
    } catch (e) { /* the tap must never affect the request itself */ }
    return p;
  };
}
_installRefusalTap();

/**
 * Fresh server evaluation. Any widget with fetchService can host the call;
 * the result feeds setCurrent so every surface updates together.
 */
async function refresh(host) {
  if (!enforcementOn() || !host || !host.fetchService) return current();
  try {
    const res = await host.fetchService(SERVICE.payment.over_limit_state, {
      hub_id: Visitor.id,
    });
    const data = (res && res.data) || res || {};
    setCurrent(data);
  } catch (e) { /* keep last known state — never invent a lock */ }
  return current();
}

module.exports = {
  CHANGED,
  enforcementOn,
  current,
  setCurrent,
  isLocked,
  isHardLock,
  isAdmin,
  isOwner,
  ownerEmail,
  orgDomainId,
  appliesToDomain,
  contactOwnerText,
  snoozedForMe,
  daysLeft,
  resolveTarget,
  storageConsoleAllowed,
  refresh,
  blockedMessage,
  notifyBlocked,
  dismissNotice,
  guardWrite,
};
