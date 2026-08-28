/**
 * Contextual tutorial sub-tours — client-side state, one module.
 *
 * The desk used to run ONE six-step tour, once, after signup. It now runs
 * several short tours, each fired by the user's first real interaction with
 * the surface it explains. That turns "has this tour been shown" from a
 * session detail into durable per-user state, which is what this module owns.
 *
 * Trigger sites hold NO state. They call `fire('folder')` and nothing else;
 * every gate — kill switch, mobile, seen-set, single-flight — is decided here,
 * so a surface that is rebuilt from scratch (the desk topbar is re-fed whole by
 * _updateAddmenu / _onOverLimitChanged) cannot lose or duplicate a trigger.
 *
 * Two pieces of state, deliberately separate, because they have different
 * lifetimes and conflating them is a defect either way round:
 *
 *   _inFlight   single-flight. Set synchronously in fire(), before the
 *               broadcast, so a double click cannot mount two tours. Cleared
 *               when the tour is destroyed (desk wires release()), or by the
 *               guard timer if the tour never mounts at all.
 *
 *   seen-set    once-ever suppression. Written ONLY by markSeen(), which the
 *               tour host calls when it has actually mounted. Marking in
 *               fire() would burn a tour whose chunk failed to load; marking
 *               on completion (the old rule) means a reload mid-tour replays
 *               it on the next qualifying click, forever.
 *
 * The seen-set is authoritative on the server and arrives free in the boot
 * payload — get_user selects `settings`, yp.get_env returns it, drumee.js
 * hands it to Visitor. localStorage is a same-device latency cover for the
 * window between the click and the ack, never the source of truth.
 */

const CHANNEL = "tutorial:trigger";

// Canonical tour ids. This list is a WIRE CONTRACT shared with two files in
// server-team, and nothing in this stack can share a constant across the two
// repos: getServices() (router/rest/index.js) ships service NAMES to the
// client and drops params, enums and docs. Adding a tour means editing:
//   - server-team acl/drumate.json                (the tour_id doc string)
//   - server-team service/private/drumate.js      (__TUTORIAL_TOURS)
//   - modules/desk/tutorial/tours.js              (the TOURS registry)
//   - here
// A mismatch fails as a silently rejected write with NO client-side symptom:
// the tour runs, the mirror suppresses it locally, the server never records
// it, and it returns on the user's next device.
const TOUR_IDS = ["workspace", "folder_task", "share", "migrate"];

// The mirror belongs to an ACCOUNT, not to a browser.
//
// It was one bare key, which leaked across logins on a shared device: isSeen()
// falls back to the mirror, so the next account signed in found every tour
// already "seen" and none of them fired — and reconcile(), reading those ids as
// missing from the new user's server map, then posted all four into their
// record. Stage showed both halves on 2026-08-19: three signups in one browser,
// the first with genuine timestamps 12-20s apart, the next two stamped with all
// four tours in a single instant ~50s after signup, one of them without ever
// having completed a tour.
//
// Suffixing the account id keeps what the mirror is FOR — one device
// remembering a tour whose server write failed — while making that claim only
// about the user it was actually true of. The old bare key is deliberately not
// migrated: its contents cannot be attributed to anyone, which is the defect.
const MIRROR_PREFIX = "drumee.tutorials_seen";

/**
 * @returns {String|null} this account's mirror key, or null when there is no
 *   account to attribute a record to (pre-auth boot). Null makes the mirror
 *   inert rather than falling back to a fixed key, which would reintroduce the
 *   same leak in miniature.
 */
function mirrorKey() {
  try {
    const id = typeof Visitor !== "undefined" && Visitor.id;
    return id ? `${MIRROR_PREFIX}:${id}` : null;
  } catch (e) {
    return null;
  }
}

// Bounds the CHUNK FETCH and nothing else. Cancelled by armed() the moment the
// tour mounts, after which only the tour's own destroy releases the guard —
// otherwise a user reading three screens would outlast it and a second trigger
// could mount a second tour on top.
const GUARD_TIMEOUT_MS = 30000;

// One retry, then give up. A tour is not an operation the user asked for, so a
// failed write is never surfaced; the mirror keeps this device suppressed and
// reconcile() re-posts on a later boot.
const RETRY_DELAY_MS = 3000;

let _inFlight = null;
let _guardTimer = null;
let _seen = null; // Set, lazily built
let _reconciled = false;

// ── environment ──────────────────────────────────────────────────────────────

/** Kill switch. Absent/0 = off, and off means nothing fires and nothing is written. */
function enabled() {
  try {
    return !!(
      typeof Platform !== "undefined" &&
      Platform.get &&
      ~~Platform.get("contextual_tours")
    );
  } catch (e) {
    return false;
  }
}

function isMobile() {
  try {
    return !!(typeof Visitor !== "undefined" && Visitor.isMobile && Visitor.isMobile());
  } catch (e) {
    return false;
  }
}

/** Any widget supplies fetchService/postService + the auth context; Wm always exists by then. */
function _host(host) {
  if (host && typeof host.postService === "function") return host;
  try {
    if (typeof window !== "undefined" && window.Wm && typeof window.Wm.postService === "function") {
      return window.Wm;
    }
  } catch (e) { /* fall through */ }
  return null;
}

function _service() {
  try {
    return (typeof SERVICE !== "undefined" && SERVICE.drumate && SERVICE.drumate.tutorial_seen)
      || "drumate.tutorial_seen";
  } catch (e) {
    return "drumate.tutorial_seen";
  }
}

// ── server side of the seen-set ──────────────────────────────────────────────

/**
 * Read the server's view out of the boot payload.
 *
 * THREE states, not two. `tutorials_seen` is created by the first write, so it
 * is ABSENT on every brand-new account — the exact population this feature
 * exists for. Treating absent as "all seen" (an earlier draft of the plan did)
 * suppresses every tour for every new user and the feature never fires for
 * anybody. Absent means armed; only a missing or malformed payload fails closed.
 *
 * @returns {Object} {degraded, all, map}
 *   degraded  the payload could not be read — suppress tours AND writes
 *   all       legacy user who finished the old monolithic tour
 *   map       tour id -> unix seconds
 */
function serverState() {
  let settings;
  try {
    settings = typeof Visitor !== "undefined" && Visitor.settings ? Visitor.settings() : null;
  } catch (e) {
    settings = null;
  }
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return { degraded: true, all: false, map: {} };
  }

  const map = settings.tutorials_seen;

  if (map === undefined || map === null) {
    // Normal new account. A pre-existing user who completed the old six-step
    // tour is recognised here and needs no server backfill: one boolean, read
    // once, saves rewriting every row of a FULLTEXT-indexed mediumtext column.
    if (settings.tutorial_done) return { degraded: false, all: true, map: {} };
    return { degraded: false, all: false, map: {} };
  }

  if (typeof map !== "object" || Array.isArray(map)) {
    return { degraded: true, all: false, map: {} };
  }

  return { degraded: false, all: false, map };
}

// ── localStorage mirror ──────────────────────────────────────────────────────

function readMirror() {
  try {
    const key = mirrorKey();
    if (!key) return [];
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter((t) => TOUR_IDS.includes(t)) : [];
  } catch (e) {
    return [];
  }
}

function writeMirror(list) {
  try {
    const key = mirrorKey();
    if (!key) return;
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) { /* private mode / quota — the server record still stands */ }
}

function addToMirror(tourId) {
  const list = readMirror();
  if (list.includes(tourId)) return;
  list.push(tourId);
  writeMirror(list);
}

// ── reconciliation ───────────────────────────────────────────────────────────

/**
 * Catch up on writes that never landed, and drop mirror entries the server has
 * since confirmed.
 *
 * LAZY ONLY, once per session. Never on module init: a require() evaluated
 * before drumee.js hands the payload to Visitor would read an empty settings
 * object, conclude every mirror entry is missing server-side, and re-post ids
 * that are already recorded. Every entry point below is reached from the desk,
 * which cannot render until init_globals has run.
 *
 * Deliberately NOT done inside fire(): a mirror hit is part of the seen union,
 * so fire() returns at the seen check and a retry placed there is unreachable.
 */
function reconcile(host) {
  if (_reconciled) return;
  _reconciled = true;

  const state = serverState();
  if (state.degraded) return;

  const mirror = readMirror();
  if (!mirror.length) return;

  const landed = [];
  const missing = [];
  for (const id of mirror) {
    // Already posted in THIS session by markSeen: the boot payload is a
    // snapshot taken before that write, so the id is legitimately absent from
    // state.map and would otherwise be re-posted every time. Harmless on the
    // server (the write is idempotent) but a wasted request per tour, and it
    // makes "did reconcile do anything" impossible to assert.
    if (_seen && _seen.has(id)) continue;
    if (state.all || Object.prototype.hasOwnProperty.call(state.map, id)) landed.push(id);
    else missing.push(id);
  }

  if (landed.length) writeMirror(missing);
  for (const id of missing) post(id, host);
}

// ── the write ────────────────────────────────────────────────────────────────

function post(tourId, host, isRetry) {
  const h = _host(host);
  if (!h) return;
  let payload = { tour_id: tourId };
  try {
    if (typeof Visitor !== "undefined" && Visitor.id) payload.hub_id = Visitor.id;
  } catch (e) { /* scope resolves server-side anyway */ }
  return h
    .postService(_service(), payload, { async: 1 })
    .catch(() => {
      if (isRetry) return;
      setTimeout(() => post(tourId, host, true), RETRY_DELAY_MS);
    });
}

// ── public API ───────────────────────────────────────────────────────────────

/**
 * Has this tour already been shown to this user, anywhere?
 *
 * Union of memory, mirror and server: a false "seen" costs one missed tour, a
 * false "unseen" is a repeated interruption.
 */
function isSeen(tourId, host) {
  reconcile(host);
  const state = serverState();
  if (state.degraded || state.all) return true;
  if (_seen && _seen.has(tourId)) return true;
  if (Object.prototype.hasOwnProperty.call(state.map, tourId)) return true;
  return readMirror().includes(tourId);
}

/**
 * Ask for a tour. The ONLY entry point a trigger site uses.
 *
 * Writes nothing to the seen-set — that is markSeen()'s job, once the tour has
 * proved it can mount.
 *
 * @returns {Boolean} whether the tour was broadcast
 */
function fire(tourId, host) {
  if (!enabled()) return false;
  if (isMobile()) return false;
  if (!TOUR_IDS.includes(tourId)) return false;
  if (isSeen(tourId, host)) return false;
  if (_inFlight) return false;

  _inFlight = tourId;
  clearTimeout(_guardTimer);
  _guardTimer = setTimeout(() => release(tourId), GUARD_TIMEOUT_MS);

  try {
    if (typeof RADIO_BROADCAST !== "undefined") {
      RADIO_BROADCAST.trigger(CHANNEL, { tour: tourId });
    }
  } catch (e) {
    // A listener that throws must not leave the guard latched for the session.
    release(tourId);
    return false;
  }
  return true;
}

/**
 * The tour is on screen. Cancels the fetch guard; from here only destroy
 * releases single-flight.
 */
function armed() {
  clearTimeout(_guardTimer);
  _guardTimer = null;
}

/**
 * The tour is gone (or never arrived). Idempotent and id-checked, so a late
 * destroy from a previous tour cannot clear a newer one's guard.
 */
function release(tourId) {
  if (tourId && _inFlight && _inFlight !== tourId) return;
  clearTimeout(_guardTimer);
  _guardTimer = null;
  _inFlight = null;
}

/** Which tour is currently held, if any. */
function inFlight() {
  return _inFlight;
}

/**
 * Record that a tour has been shown. Called by the tour host on mount, and by
 * the full-tour exit for every flagged tour at once.
 *
 * Mirror first, synchronously, so this device stays suppressed whatever the
 * network does.
 */
function markSeen(tourId, host) {
  if (!TOUR_IDS.includes(tourId)) return;
  // Kill switch off means the feature does not exist, so it writes nothing at
  // all — not even from the full tour's exit, which records every flagged tour
  // and would otherwise be the one path that posts while the switch is off.
  // "Off is byte-for-byte today's behaviour" has to include the network.
  //
  // The cost is a rollout corner: someone who completes the full tour while it
  // is off, and is then switched on, sees the contextual tours anyway. Showing
  // a three-screen tour twice is a far smaller error than writing suppression
  // state for a disabled feature.
  if (!enabled()) return;
  const state = serverState();
  // A degraded payload suppresses WRITES as well as tours: never record a tour
  // against a user whose settings we could not read.
  if (state.degraded) return;
  if (!_seen) _seen = new Set();
  if (_seen.has(tourId)) return;
  _seen.add(tourId);
  addToMirror(tourId);
  post(tourId, host);
}

/** QA reset (`?tutorial=reset`). Server re-checks profile.devel; this is the client half. */
function reset(host) {
  _seen = new Set();
  _reconciled = true;
  writeMirror([]);
  const h = _host(host);
  if (!h) return Promise.resolve();
  return h.postService(_service(), { reset: 1 }, { async: 1 }).catch(() => {});
}

/** Test seam only — never called by app code. */
function __resetModuleState() {
  _inFlight = null;
  clearTimeout(_guardTimer);
  _guardTimer = null;
  _seen = null;
  _reconciled = false;
}

module.exports = {
  CHANNEL,
  TOUR_IDS,
  GUARD_TIMEOUT_MS,
  MIRROR_PREFIX,
  mirrorKey,
  enabled,
  serverState,
  isSeen,
  fire,
  armed,
  release,
  inFlight,
  markSeen,
  reconcile,
  reset,
  __resetModuleState,
};
