/**
 * Session-change guard — a stale tab must not act as another account.
 *
 * Every account of an org signs in on the same origin, so a browser keeps ONE
 * session cookie for all of them: signing in as B in one tab (or signing out)
 * swaps the session under every other open tab. Those tabs kept drawing A's
 * desk while their requests ran as B (stage, 2026-11-06: a tab showing
 * yipejo5194's desk sent media.attributes as s110@drumee.com, then as nobody).
 * Reads were refused with a confusing "not a member" alert; a write would
 * have gone through as B.
 *
 * Two halves, one card:
 *
 *   A  cross-tab announcement. A tab says who it is when it boots (every
 *      sign-in ends in a reload, so the new tab is always the one speaking)
 *      and when it signs out. Other tabs of a REAL user that hear a different
 *      uid show the blocking card. BroadcastChannel, with the localStorage
 *      `storage` event as the fallback.
 *   C  server-enforced. Every same-origin /svc/ fetch carries `x-drumee-uid`;
 *      server-team router/rest/session-guard refuses a mismatch with
 *      412 SESSION_CHANGED before the service runs, and the tap here turns
 *      that answer into the same card. Covers what A cannot see: expiry, a
 *      sign-out from another device, an admin reset.
 *
 * Plus the websocket: a reconnect used to `Visitor.set(data.user)` silently,
 * adopting B's identity under A's desk. acceptSocketUser() refuses that.
 *
 * Pure helpers + createGuard(env) are exported for tests (every browser
 * global injected); init() wires the real window. Plan:
 * docs/superpowers/plans/2026-11-06-session-change-guard.md
 */

const NOBODY = "ffffffffffffffff";
const UID_RE = /^[0-9a-f]{16}$/;
const CHANNEL = "drumee-session";
const STORAGE_KEY = "drumee:session";
const HEADER = "x-drumee-uid";
const SVC_RE = /\/svc[/?]/;

/** A signed-in account: a 16-hex uid that is neither nobody nor the guest. */
function isRealUser(uid, guestId) {
  if (typeof uid !== "string") return false;
  const u = uid.toLowerCase();
  if (!UID_RE.test(u) || u === NOBODY) return false;
  if (guestId && u === String(guestId).toLowerCase()) return false;
  return true;
}

/**
 * What a tab does with another tab's announcement.
 * @returns {null|{reason:"other"|"signed_out", label:String}}
 */
function decide(myUid, msg, myTab, guestId) {
  if (!msg || typeof msg !== "object" || !msg.uid) return null;
  if (msg.tab && msg.tab === myTab) return null;
  if (!isRealUser(myUid, guestId)) return null;
  const uid = String(msg.uid).toLowerCase();
  if (uid === String(myUid).toLowerCase()) return null;
  if (!isRealUser(uid, guestId)) return { reason: "signed_out", label: "" };
  return { reason: "other", label: String(msg.label || "") };
}

/**
 * Stamp x-drumee-uid on a same-origin /svc/ request. Returns [input, init]
 * to hand to the real fetch; anything else comes back untouched.
 */
function withUidHeader(input, init, uid, origin, guestId) {
  try {
    if (!isRealUser(uid, guestId)) return [input, init];
    const isReq = typeof Request !== "undefined" && input instanceof Request;
    const raw = typeof input === "string" ? input : (input && input.url) || String(input || "");
    const url = new URL(raw, origin);
    if (url.origin !== origin || !SVC_RE.test(url.pathname + url.search)) return [input, init];
    if (isReq && !init) {
      const headers = new Headers(input.headers);
      headers.set(HEADER, uid);
      return [new Request(input, { headers }), init];
    }
    const headers = new Headers((init && init.headers) || (isReq ? input.headers : undefined));
    headers.set(HEADER, uid);
    return [input, { ...(init || {}), headers }];
  } catch (e) {
    return [input, init];
  }
}

/** The server's refusal of a stale tab (server-team router/rest/session-guard). */
function isSessionChanged(status, body) {
  return status === 412 && !!body && body.error === "SESSION_CHANGED";
}

/**
 * @param {Object} env
 *   win               window-like: location.origin, addEventListener, fetch, localStorage
 *   BroadcastChannel  constructor or undefined
 *   getUid()          the uid this tab believes in (Visitor.id)
 *   guestId           platform guest id, optional
 *   onStale({reason,label})  called ONCE, the first time the tab goes stale
 *   tabId             this page load's id
 */
function createGuard(env) {
  const { win, getUid, onStale } = env;
  const tabId = env.tabId || Math.random().toString(36).slice(2);
  let channel = null;
  let stale = false;
  let listening = false;
  let fetchInstalled = false;

  const markStale = (s) => {
    if (stale) return;
    stale = true;
    try { onStale && onStale(s); } catch (e) { /* the card must not throw back */ }
  };

  const openChannel = () => {
    if (channel || !env.BroadcastChannel) return channel;
    try { channel = new env.BroadcastChannel(CHANNEL); } catch (e) { channel = null; }
    return channel;
  };

  const hear = (msg) => {
    const d = decide(getUid(), msg, tabId, env.guestId);
    if (d) markStale(d);
  };

  return {
    tabId,
    isStale: () => stale,
    markStale,

    announce(uid, label = "") {
      const msg = { uid: String(uid || NOBODY), label: String(label || ""), tab: tabId, at: Date.now() };
      try { const c = openChannel(); c && c.postMessage(msg); } catch (e) { /* none */ }
      // The `storage` event only fires in OTHER tabs, and only on a change —
      // `at` makes every announcement a change.
      try { win.localStorage && win.localStorage.setItem(STORAGE_KEY, JSON.stringify(msg)); } catch (e) { /* private mode */ }
    },

    listen() {
      if (listening) return;
      listening = true;
      const c = openChannel();
      if (c) c.onmessage = (e) => hear(e && e.data);
      try {
        win.addEventListener("storage", (e) => {
          if (!e || e.key !== STORAGE_KEY || !e.newValue) return;
          let msg = null;
          try { msg = JSON.parse(e.newValue); } catch (err) { return; }
          hear(msg);
        });
      } catch (e) { /* none */ }
    },

    installFetchGuard() {
      if (fetchInstalled || !win || typeof win.fetch !== "function") return;
      fetchInstalled = true;
      const orig = win.fetch.bind(win);
      win.fetch = function (input, init) {
        const origin = (win.location && win.location.origin) || "";
        const [i, o] = withUidHeader(input, init, getUid(), origin, env.guestId);
        const p = orig(i, o);
        try {
          p.then((res) => {
            if (!res || res.status !== 412) return;
            res.clone().json().then((j) => {
              if (isSessionChanged(res.status, j)) markStale({ reason: "generic", label: "" });
            }).catch(() => { });
          }).catch(() => { });
        } catch (e) { /* the tap must never affect the request */ }
        return p;
      };
    },

    /**
     * The websocket's own handshake carries the session's user. A tab that
     * holds a real account and hears another one must not adopt it.
     * @returns {Boolean} true → the caller may Visitor.set(user)
     */
    acceptSocketUser(user) {
      const mine = getUid();
      if (!isRealUser(mine, env.guestId)) return true;
      const theirs = user && user.id;
      if (!theirs || String(theirs).toLowerCase() === String(mine).toLowerCase()) return true;
      markStale(isRealUser(theirs, env.guestId)
        ? { reason: "other", label: String(user.email || user.username || "") }
        : { reason: "signed_out", label: "" });
      return false;
    },
  };
}

// ── The card ────────────────────────────────────────────────────────────────
//
// Plain DOM, not Butler: Butler has its own scrim, state and close paths, and
// nothing may dismiss this one but a reload. Swallows every pointer and key
// event outside its button, so the stale desk behind it can do nothing.

function cardText(s) {
  const L = (typeof LOCALE !== "undefined" && LOCALE) || {};
  const title = L.SESSION_CHANGED_TITLE || "Your session changed";
  let body;
  if (s.reason === "other" && s.label) {
    body = (L.SESSION_CHANGED_OTHER || "You're now signed in as {0} in another tab.").replace("{0}", s.label);
  } else if (s.reason === "signed_out") {
    body = L.SESSION_CHANGED_SIGNED_OUT || "You signed out in another tab.";
  } else {
    body = L.SESSION_CHANGED_GENERIC || "This tab's session is no longer valid.";
  }
  return { title, body, button: L.RELOAD || "Reload" };
}

function showCard(s) {
  if (typeof document === "undefined" || !document.body) return;
  if (document.querySelector(".session-guard__overlay")) return;
  const t = cardText(s);
  const overlay = document.createElement("div");
  overlay.className = "session-guard__overlay";
  overlay.setAttribute("role", "alertdialog");
  overlay.setAttribute("aria-modal", "true");
  Object.assign(overlay.style, {
    position: "fixed", inset: "0", zIndex: "2147483000",
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "rgba(0,0,0,0.45)", padding: "16px", boxSizing: "border-box",
    fontFamily: "var(--font-main, sans-serif)",
  });
  const card = document.createElement("div");
  card.className = "session-guard__card";
  Object.assign(card.style, {
    width: "min(400px, 100%)", boxSizing: "border-box", padding: "24px",
    borderRadius: "12px", background: "var(--normal-bg-elevated, #fff)",
    color: "var(--normal-fg-800, #1a1a1a)",
    boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
    display: "flex", flexDirection: "column", gap: "12px",
  });
  const title = document.createElement("div");
  title.textContent = t.title;
  Object.assign(title.style, { fontSize: "19px", fontWeight: "600", lineHeight: "1.3" });
  const body = document.createElement("div");
  body.textContent = t.body;
  Object.assign(body.style, { fontSize: "13.5px", lineHeight: "1.55", overflowWrap: "anywhere" });
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "session-guard__reload";
  btn.textContent = t.button;
  Object.assign(btn.style, {
    marginTop: "8px", padding: "12px", border: "0", borderRadius: "10px",
    background: "var(--primary-50, #4f46e5)", color: "#fff",
    fontSize: "13.5px", fontWeight: "600", cursor: "pointer",
  });
  btn.addEventListener("click", () => location.reload());
  card.append(title, body, btn);
  overlay.append(card);
  document.body.append(overlay);

  const swallow = (e) => {
    if (e.target === btn) return;
    if (e.type === "keydown" && document.activeElement === btn && (e.key === "Enter" || e.key === " ")) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  };
  for (const type of ["pointerdown", "mousedown", "mouseup", "click", "dblclick",
    "contextmenu", "touchstart", "touchend", "keydown", "keyup", "wheel"]) {
    window.addEventListener(type, swallow, { capture: true, passive: false });
  }
  try { btn.focus(); } catch (e) { /* none */ }
}

// ── The page's own guard ────────────────────────────────────────────────────

let _guard = null;

function _guestId() {
  try {
    return (typeof Platform !== "undefined" && Platform.get && Platform.get("guest_id")) || null;
  } catch (e) {
    return null;
  }
}

/** This page's guard, created on first use against the real window. */
function guard() {
  if (_guard || typeof window === "undefined") return _guard;
  _guard = createGuard({
    win: window,
    BroadcastChannel: typeof BroadcastChannel !== "undefined" ? BroadcastChannel : undefined,
    getUid: () => (typeof Visitor !== "undefined" && Visitor.id) || NOBODY,
    guestId: _guestId(),
    onStale: showCard,
  });
  return _guard;
}

/**
 * Boot wiring — drumee.js init_globals(), right after Visitor.set(user):
 * install the fetch guard (C), listen to other tabs (A), say who this tab is.
 */
function init(user) {
  const g = guard();
  if (!g) return;
  g.installFetchGuard();
  g.listen();
  if (user && isRealUser(user.id, _guestId())) {
    g.announce(user.id, user.email || user.username || "");
  }
}

/** Sign-out (Butler.logout): tell the other tabs before redirecting. */
function announceSignedOut() {
  const g = guard();
  if (g) g.announce(NOBODY, "");
}

/** Websocket handshake identity check — see createGuard().acceptSocketUser. */
function acceptSocketUser(user) {
  const g = guard();
  return g ? g.acceptSocketUser(user) : true;
}

/**
 * Where sign-out lands: the main domain (or this host), SAME path and query,
 * and NO hash. The hash is the address bar's last location — libs/location-url
 * keeps it on the open workspace (#/desk/wm/o/<nid>/<hub>/folder) — and
 * carrying it through sign-out made the NEXT account's sign-in open the
 * previous account's workspace as a link ("You can't open this link: this
 * account isn't a member of its workspace").
 *
 * @param {Location|Object} loc
 * @param {String} mainDomain
 * @returns {String}
 */
function signedOutUrl(loc, mainDomain) {
  const host = mainDomain || loc.hostname;
  return `${loc.protocol}//${host}${loc.pathname || "/"}${loc.search || ""}`;
}

module.exports = {
  signedOutUrl,
  NOBODY,
  HEADER,
  isRealUser,
  decide,
  withUidHeader,
  isSessionChanged,
  createGuard,
  init,
  announceSignedOut,
  acceptSocketUser,
};
