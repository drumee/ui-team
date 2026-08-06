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
function notifyBlocked(kind) {
  const now = Date.now();
  if (now - _lastToastAt < 2500) return;
  _lastToastAt = now;
  try {
    if (typeof Butler !== "undefined" && Butler.say) Butler.say(blockedMessage(kind));
    else if (typeof Wm !== "undefined" && Wm.alert) Wm.alert(blockedMessage(kind));
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
  snoozedForMe,
  daysLeft,
  refresh,
  blockedMessage,
  notifyBlocked,
  guardWrite,
};
