/**
 * welcome/signin OAuth (Google / Apple) sign-in.
 *
 * These tests drive the REAL module. Nothing here reimplements its logic: the
 * bundle-only surroundings are stubbed (the LetcBox base chain, Skeletons,
 * LOCALE, _a/_e, SERVICE, Visitor, bootstrap, and the `.scss` / skeleton-helper
 * requires that only webpack can resolve) and then src/.../welcome/signin is
 * required as-is.
 *
 * The behaviours worth locking down, and why:
 *
 *  - ORDERING. session_check_cookie derives `connection` from the otp TABLE, not
 *    from cookie.status (yellow_page/procedures/session/session_check_cookie.sql).
 *    After loby's provider callback there is a pending cookie AND a freshly
 *    minted code, so the page loads with connection == 'otp'. If the OAuth
 *    hand-off is not tested first, the password-2FA branch takes the return and
 *    posts to yp.authenticate with a client-side secret this path deliberately
 *    does not have.
 *
 *  - THE dtk_otp FAILURE SHAPE. oauth.verify_otp answers {status:'error'}, which
 *    is on none of the widget's failure lists and carries no `error` key, so a
 *    mistyped code would read as success and silently reload the screen.
 *
 *  - NO SECRET CLIENT-SIDE. On this path the OTP secret never leaves the server.
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const SIGNIN = path.join(ROOT, "src/drumee/modules/welcome/signin");

// ---------------------------------------------------------------------------
// Stub base class, standing in for interact -> password-meter -> core -> LetcBox.
// ---------------------------------------------------------------------------
class StubBase {
  initialize() { }
  declareHandlers() { }
  onUiEvent() { return "SUPER"; }
  warn(...a) { this._warns.push(a); }
  mget(k) { return (this._model || {})[k]; }
  mset(o) { Object.assign(this._model, o); }
  feed(x) { this._fed.push(x); return x; }
  getPart(n) { return (this._parts || {})[n]; }
  ensurePart(n) { return Promise.resolve((this._parts || {})[n]); }
  postService(api, vars) {
    this._posts.push({ api, vars });
    const r = this._responses.shift();
    return r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
  }
  gotSignedIn() { this._signedIn = true; }
  suppress() { }
  onDestroy() { }
}

// Intercept the requires that only exist under webpack.
const realLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (/\.scss$/.test(request)) return {};
  if (/(^|\/)\.\.\/interact$/.test(request) || /\/interact$/.test(request)) return StubBase;
  if (/skeleton\/common\/(button|message-box)$/.test(request)) {
    return { default: (...a) => ({ stub: request, a }) };
  }
  return realLoad(request, parent, isMain);
};

// ---------------------------------------------------------------------------
// Bundle globals.
// ---------------------------------------------------------------------------
global._ = require(path.join(ROOT, "node_modules/lodash"));
global._a = {
  ok: "ok", api: "api", email: "email", dataset: "dataset", sys_pn: "sys_pn",
  password: "password", commit: "commit", error: "error", url: "url",
  open: "open", closed: "closed", loader: "loader", mobile: "mobile",
  socket_id: "socket_id", system: "system",
};
global._e = {
  submit: "submit", commit: "commit", Enter: "Enter", show: "show",
  part: { ready: "part.ready" },
};
global.LOCALE = {
  OR: "or", EMAIL: "Email", PASSWORD: "Password",
  MULTI_FACTOR_AUTH: "Multi factor authentication",
  UNKNOWN_ERROR: "Unknown error", TRY_AGAIN_LATER: "Please try again later",
  NEW_CODE_RESENT: "New code sent", CONTINUE_WITH_GOOGLE: "Continue with Google",
  PRIVACY_POLICY: "privacy", TERM_OF_SERVICE: "terms",
  ENTER_YOUR_EMAIL: "", ENTER_YOUR_PASSWORD: "", Q_NO_ACCOUNT: "",
  START_FREE: "", Q_FORGOT_PASSWORD: "", LOG_IN_TO_WORKSPACE: "",
};
// String.prototype.format — the real one, since the OTP copy depends on it.
require(path.join(ROOT, "node_modules/@drumee/ui-core/letc/addons/string.js"));

const mkBox = (kind) => (o) => ({ _box: kind, ...o });
global.Skeletons = {
  Box: { X: mkBox("X"), Y: mkBox("Y") },
  Note: (o) => ({ _note: 1, ...o }),
  Element: (o) => ({ _el: 1, ...o }),
  EntryBox: (o) => ({ _entry: 1, ...o }),
  Button: { Svg: (o) => ({ _svg: 1, ...o }) },
};
global.Kind = { exists: () => true, waitFor: () => Promise.resolve(), registerAddons: () => { } };
global.Organization = { name: () => "Acme", get: () => 1 };
global.Platform = { get: (k) => (k === "arch" ? "cloud" : k === "isPublic" ? 1 : null) };
global.Visitor = {
  profile: () => ({}), get: () => "", timeout: (t) => t,
  parseModuleArgs: () => global.__ARGS,
};
global.bootstrap = () => ({ endpoint: "/-/", connection: global.__CONNECTION });
global.SERVICE = {};
global.uiRouter = { ensureWebsocket: () => Promise.resolve(), changeHost: () => { global.__CHANGED_HOST = true; } };
global.RADIO_BROADCAST = { once: () => { }, trigger: () => { } };
global.wsRouter = { restart: () => { } };
global.Butler = { sleep: () => { } };
global._K = { module: { signup: "#/welcome/signup" } };
global.history = { replaceState: () => { global.__REPLACED = true; } };
global.location = {
  host: "", hash: "", reload: () => { global.__RELOADED = true; },
  set href(v) { global.__HREF = v; },
  get href() { return global.__HREF; },
};

const Signin = require(path.join(SIGNIN, "index.js"));

/** Fresh navigation/global state; called at the top of every test. */
function reset() {
  global.__HREF = null;
  global.__REPLACED = false;
  global.__RELOADED = false;
  global.__CHANGED_HOST = false;
  global.__ARGS = {};
  global.__CONNECTION = "offline";
  global.SERVICE = {};
}

function mkInstance(over = {}) {
  const o = Object.create(Signin.prototype);
  return Object.assign(o, {
    _model: {}, _fed: [], _posts: [], _messages: [], _warns: [], _loading: [],
    _responses: [], _parts: {}, fig: { family: "welcome-signin" },
    _skeleton: (ui, opt) => ({ _page: 1, ...opt }),
    // Own properties: the class defines its own renderMessage/setButtonLoading,
    // which shadow the base stubs and need real DOM parts. What matters here is
    // that the OAuth code CALLS them, so record the calls.
    renderMessage(m) { this._messages.push(m); },
    setButtonLoading(v) { this._loading.push(v); },
  }, over);
}

const ev = (service) => [{ model: { get: () => null } }, { service }];

// Walk every nested object/array: the page skeleton nests the screen under
// `content`, so a kids-only walk would miss it.
function flat(n, out = [], seen = new Set()) {
  if (!n || typeof n !== "object" || seen.has(n)) return out;
  seen.add(n);
  if (Array.isArray(n)) {
    for (const v of n) flat(v, out, seen);
    return out;
  }
  out.push(n);
  for (const v of Object.values(n)) {
    if (v && typeof v === "object") flat(v, out, seen);
  }
  return out;
}
const hasService = (t, s) => flat(t).some((n) => n.service === s);
const hasClass = (t, c) => flat(t).some((n) => (n.className || "").includes(c));

// ===========================================================================
// Hash-query parsing. parseModuleArgs splits on [#/&?] and does NOT decode.
// ===========================================================================
test("the hand-off email is percent-decoded", () => {
  reset();
  assert.equal(mkInstance()._decodeArg("jo%40drumee.org"), "jo@drumee.org");
});

test("a malformed escape does not throw", () => {
  reset();
  assert.equal(mkInstance()._decodeArg("100%"), "100%");
});

test("a missing arg reads as an empty string", () => {
  reset();
  const s = mkInstance();
  assert.equal(s._decodeArg(undefined), "");
  assert.equal(s._decodeArg(null), "");
});

test("oauth_mfa params are read only when the flag is set", () => {
  reset();
  global.SERVICE = { oauth: { verify_otp: "oauth.verify_otp" } };
  assert.equal(mkInstance()._oauthMfaParams(), null);

  global.__ARGS = { oauth_mfa: "0" };
  assert.equal(mkInstance()._oauthMfaParams(), null);

  global.__ARGS = { oauth_mfa: "1", email: "jo%40drumee.org" };
  assert.deepEqual(mkInstance()._oauthMfaParams(), { email: "jo@drumee.org" });
});

test("the OTP screen is refused when oauth.verify_otp is unregistered", () => {
  // Better the sign-in form than a screen that takes a code it cannot submit.
  reset();
  global.__ARGS = { oauth_mfa: "1", email: "jo%40drumee.org" };
  const s = mkInstance();
  assert.equal(s._oauthMfaParams(), null);
  assert.equal(s._warns.length, 1);
});

// ===========================================================================
// The ordering guarantee.
// ===========================================================================
test("an OAuth 2FA return wins over connection:'otp'", () => {
  reset();
  global.__ARGS = { oauth_mfa: "1", email: "jo%40drumee.org" };
  global.SERVICE = { oauth: { verify_otp: "oauth.verify_otp" } };
  global.__CONNECTION = "otp";
  const s = mkInstance();
  let prompted = null;
  s._promptOtpOauth = (email) => { prompted = email; };
  s.prompt_otp = () => assert.fail("password-2FA branch took the OAuth return");
  s.onDomRefresh();
  assert.equal(prompted, "jo@drumee.org");
});

test("a plain connection:'otp' still reaches the password-2FA branch", () => {
  reset();
  global.SERVICE = { oauth: { verify_otp: "x" } };
  global.__CONNECTION = "otp";
  // That branch only prompts once the tab is on the org's own host; otherwise it
  // redirects there first. Satisfy the host check so we reach prompt_otp.
  global.location.host = "acme.drumee.com";
  const orgGet = global.Organization.get;
  global.Organization.get = (k) => (k === "url" ? "acme.drumee.com" : 1);
  try {
    const s = mkInstance();
    let prompted = false;
    s.prompt_otp = () => { prompted = true; };
    s._promptOtpOauth = () => assert.fail("OAuth screen hijacked the password path");
    s.onDomRefresh();
    assert.equal(prompted, true);
  } finally {
    global.Organization.get = orgGet;
    global.location.host = "";
  }
});

// ===========================================================================
// Failure returns.
// ===========================================================================
test("oauth_error is shown on the form and scrubbed from the URL", () => {
  reset();
  global.__ARGS = { oauth_error: "access_denied" };
  const s = mkInstance();
  s.onDomRefresh();
  assert.equal(s._fed.length, 1, "the form must still render");
  assert.equal(s._messages[0], "Sign-in was cancelled");
  assert.equal(global.__REPLACED, true, "a reload must not replay the message");
});

test("a normal load says nothing", () => {
  reset();
  const s = mkInstance();
  s.onDomRefresh();
  assert.equal(s._messages.length, 0);
});

test("no provider error token ever reaches the screen raw", () => {
  reset();
  const s = mkInstance();
  const tokens = [
    "access_denied", "oauth_not_linked", "credentials_missing",
    "oauth_init_failed", "invalid_state", "oauth_failed", "invalid_code",
    "account_creation_failed", "session_fetch_failed", "unexpected_error",
    "a_reason_added_server_side_later", undefined,
  ];
  for (const t of tokens) {
    const m = s._oauthErrorMessage(t);
    assert.ok(m && m.length > 3, `no copy for ${t}`);
    assert.ok(!/_/.test(m), `raw token leaked for ${t}: ${m}`);
  }
});

// ===========================================================================
// initiate -> provider redirect.
// ===========================================================================
test("initiate drives the redirect", async () => {
  // The URL must come from initiate: it also persists the single-use state row
  // carrying this session id, which is how the cross-site callback finds its way
  // back to this visitor.
  reset();
  global.SERVICE = { google: { initiate: "google.initiate" } };
  const s = mkInstance({ _responses: [{ status: "prompt", authUrl: "https://accounts.google.com/x" }] });
  s.startOauth("google");
  await new Promise((r) => setImmediate(r));
  assert.equal(global.__HREF, "https://accounts.google.com/x");
  assert.deepEqual(s._posts[0], { api: "google.initiate", vars: {} });
  assert.deepEqual(s._loading, [true], "the spinner stays up while navigating away");
});

test("a refused initiate is reported and does not navigate", async () => {
  reset();
  global.SERVICE = { apple: { initiate: "apple.initiate" } };
  const s = mkInstance({ _responses: [{ status: "error", error: "credentials_missing" }] });
  s.startOauth("apple");
  await new Promise((r) => setImmediate(r));
  assert.equal(global.__HREF, null);
  assert.equal(s._messages[0], "Please try again later");
  assert.deepEqual(s._loading, [true, false]);
});

test("a failed initiate request is reported and does not navigate", async () => {
  reset();
  global.SERVICE = { google: { initiate: "google.initiate" } };
  const s = mkInstance({ _responses: [new Error("network down")] });
  s.startOauth("google");
  await new Promise((r) => setImmediate(r));
  assert.equal(global.__HREF, null);
  assert.equal(s._messages[0], "Please try again later");
  assert.deepEqual(s._loading, [true, false]);
});

test("an unregistered provider service is never posted to", () => {
  reset();
  const s = mkInstance();
  s.startOauth("google");
  assert.equal(s._posts.length, 0);
  assert.equal(s._messages.length, 1);
});

test("the buttons route to their providers", () => {
  reset();
  const s = mkInstance();
  const seen = [];
  s.startOauth = (p) => seen.push(p);
  s.onUiEvent(...ev("use-google"));
  s.onUiEvent(...ev("use-apple"));
  assert.deepEqual(seen, ["google", "apple"]);
});

// ===========================================================================
// The 2FA screen.
// ===========================================================================
test("the 2FA screen is wired to oauth.verify_otp and carries no secret", async () => {
  reset();
  global.SERVICE = { oauth: { verify_otp: "oauth.verify_otp", resend_otp: "oauth.resend_otp" } };
  const s = mkInstance({ _parts: { "oauth-otp": { marker: 1 } } });
  let armed = null;
  s._armOauthOtp = (o) => { armed = o; };
  await s._promptOtpOauth("jo@drumee.org");

  assert.equal(s._inOauthMfa, true, "back-to-signin keys off this flag");
  assert.equal(s._fed.length, 1);
  const otp = flat(s._fed[0]).find((n) => n.kind === "dtk_otp");
  assert.ok(otp, "no dtk_otp in the screen");
  assert.equal(otp.api, "oauth.verify_otp");
  assert.equal(otp.sys_pn, "oauth-otp");
  assert.equal(otp.resendService, "resend-oauth-otp");
  assert.equal(otp.service, "oauth-otp-verified");
  assert.equal(otp.length, 6);
  assert.ok(!("secret" in otp.payload), "the OTP secret must stay server-side");
  assert.equal(otp.payload.email, "jo@drumee.org");
  assert.match(otp.message, /jo@drumee\.org/);
  assert.ok(hasService(s._fed[0], "back-to-signin"), "no escape hatch");
  assert.ok(hasClass(s._fed[0], "oauth"), "the skin targets .oauth");

  await new Promise((r) => setImmediate(r));
  assert.ok(armed, "the widget must be armed for the failure-shape fix");
});

test("the 2FA screen renders into the existing content slot", async () => {
  reset();
  global.SERVICE = { oauth: { verify_otp: "oauth.verify_otp" } };
  const inner = [];
  const s = mkInstance({ __content: { feed: (x) => inner.push(x) } });
  s._armOauthOtp = () => { };
  await s._promptOtpOauth("a@b.com");
  assert.equal(inner.length, 1);
  assert.equal(s._fed.length, 0, "the whole page must not be re-rendered");
});

test("the 2FA copy holds up with no email in the hand-off", async () => {
  reset();
  global.SERVICE = { oauth: { verify_otp: "oauth.verify_otp" } };
  const s = mkInstance();
  s._armOauthOtp = () => { };
  await s._promptOtpOauth("");
  const otp = flat(s._fed[0]).find((n) => n.kind === "dtk_otp");
  assert.ok(otp.message);
  assert.doesNotMatch(otp.message, /\{0\}/, "unsubstituted placeholder");
});

// ===========================================================================
// The dtk_otp failure-shape fix.
// ===========================================================================
function mkOtpStub(response) {
  return {
    _model: { api: "oauth.verify_otp" },
    mget(k) { return this._model[k]; },
    postService(service, vars) { this._lastVars = vars; return Promise.resolve(response); },
  };
}

test("a rejected code is turned into an error the widget recognises", async () => {
  reset();
  const otp = mkOtpStub({ status: "error" });
  mkInstance()._armOauthOtp(otp);
  const out = await otp.postService("oauth.verify_otp", { code: "000000" });
  assert.equal(out.error, 1, "the widget would otherwise read this as success");
});

test("a good code is left alone", async () => {
  reset();
  const otp = mkOtpStub({ status: "success" });
  mkInstance()._armOauthOtp(otp);
  const out = await otp.postService("oauth.verify_otp", { code: "123456" });
  assert.ok(!out.error);
});

test("only the verify POST is normalized", async () => {
  reset();
  const otp = mkOtpStub({ status: "error" });
  mkInstance()._armOauthOtp(otp);
  const out = await otp.postService("some.other.service", {});
  assert.ok(!out.error);
});

test("arming twice does not double-wrap", () => {
  reset();
  const s = mkInstance();
  const otp = mkOtpStub({ status: "error" });
  s._armOauthOtp(otp);
  const first = otp.postService;
  s._armOauthOtp(otp);
  assert.equal(otp.postService, first);
});

// ===========================================================================
// Resend.
// ===========================================================================
test("a resend clears the stale digits and confirms", async () => {
  reset();
  global.SERVICE = { oauth: { resend_otp: "oauth.resend_otp" } };
  const cleared = [];
  const boxes = [
    { setValue: (v) => cleared.push(v), focus: () => { } },
    { setValue: (v) => cleared.push(v) },
  ];
  const said = [];
  const otp = {
    el: { dataset: {} },
    displayMessage: (m, e) => said.push([m, e]),
    ensurePart: () => Promise.resolve({ children: { toArray: () => boxes } }),
  };
  const s = mkInstance({ _parts: { "oauth-otp": otp }, _responses: [{ status: "ok" }] });
  await s._resendOauthOtp();
  assert.deepEqual(cleared, ["", ""], "a half-typed old code must not survive");
  assert.equal(said[0][0], "New code sent");
  assert.equal(otp.el.dataset.resending, "0", "the spinner must be released");
});

test("a refused resend is surfaced as an error", async () => {
  reset();
  global.SERVICE = { oauth: { resend_otp: "oauth.resend_otp" } };
  const said = [];
  const otp = {
    el: { dataset: {} },
    displayMessage: (m, e) => said.push([m, e]),
    ensurePart: () => Promise.resolve(null),
  };
  const s = mkInstance({ _parts: { "oauth-otp": otp }, _responses: [{ status: "error" }] });
  await s._resendOauthOtp();
  assert.equal(said[0][0], "Unknown error");
  assert.equal(said[0][1], 1);
});

test("a second resend click while one is in flight is ignored", async () => {
  reset();
  global.SERVICE = { oauth: { resend_otp: "oauth.resend_otp" } };
  const s = mkInstance({ _responses: [{ status: "ok" }], _resendingOauth: true });
  await s._resendOauthOtp();
  assert.equal(s._posts.length, 0);
});

// ===========================================================================
// Leaving and finishing.
// ===========================================================================
test("leaving the 2FA screen cancels the pending session first", async () => {
  // Without cancel_otp the otp_pending cookie survives and the page lands right
  // back on this screen; session_logout cannot clear it (it matches by uid).
  reset();
  global.SERVICE = { oauth: { cancel_otp: "oauth.cancel_otp" } };
  const s = mkInstance({ _inOauthMfa: true, _responses: [{ status: "ok" }] });
  s.onUiEvent(...ev("back-to-signin"));
  await new Promise((r) => setImmediate(r));
  assert.equal(s._posts[0].api, "oauth.cancel_otp");
  assert.equal(global.__RELOADED, true);
  assert.equal(s._inOauthMfa, false);
});

test("a failed cancel does not trap the user on the 2FA screen", async () => {
  reset();
  global.SERVICE = { oauth: { cancel_otp: "oauth.cancel_otp" } };
  const s = mkInstance({ _inOauthMfa: true, _responses: [new Error("boom")] });
  s._cancelOauthMfa();
  await new Promise((r) => setImmediate(r));
  assert.equal(global.__RELOADED, true);
});

test("back-to-signin elsewhere does not call cancel_otp", () => {
  reset();
  global.SERVICE = { oauth: { cancel_otp: "oauth.cancel_otp" } };
  const s = mkInstance({ _model: { reconnect: 0 } });
  s.showSignin = () => { s._showed = true; };
  s.onUiEvent(...ev("back-to-signin"));
  assert.equal(s._posts.length, 0);
  assert.equal(s._showed, true);
});

test("a verified code scrubs the hand-off params before reloading", () => {
  // Reloading with oauth_mfa=1 still set would re-enter the OTP screen against a
  // session that has already been finalized.
  reset();
  const s = mkInstance();
  s.onUiEvent(...ev("oauth-otp-verified"));
  assert.equal(global.__REPLACED, true);
  assert.equal(global.__RELOADED, true);
});

test("unrelated services still fall through to the base handler", () => {
  reset();
  assert.equal(mkInstance().onUiEvent(...ev("something-else")), "SUPER");
});

// ===========================================================================
// Button gating: the services come from the loby plugin and may be absent.
// ===========================================================================
function renderContent() {
  delete require.cache[path.join(SIGNIN, "skeleton/content.js")];
  return require(path.join(SIGNIN, "skeleton/content.js"))(mkInstance());
}

test("both buttons render when both services exist", () => {
  reset();
  global.SERVICE = { google: { initiate: "g" }, apple: { initiate: "a" } };
  const t = renderContent();
  assert.ok(hasService(t, "use-google"));
  assert.ok(hasService(t, "use-apple"));
  assert.ok(hasClass(t, "__divider"));
});

test("with no provider services the divider goes too", () => {
  reset();
  const t = renderContent();
  assert.ok(!hasService(t, "use-google"), "a dead Google button must not render");
  assert.ok(!hasService(t, "use-apple"), "a dead Apple button must not render");
  assert.ok(!hasClass(t, "__divider"), "an 'or' above nothing");
  assert.ok(hasClass(t, "__form-section"), "the password form must survive");
});

test("gating is per provider", () => {
  reset();
  global.SERVICE = { google: { initiate: "g" } };
  const t = renderContent();
  assert.ok(hasService(t, "use-google"));
  assert.ok(!hasService(t, "use-apple"));
  assert.ok(hasClass(t, "__divider"), "the divider stays for the one provider");
});
