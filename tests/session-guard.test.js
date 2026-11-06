// tests/session-guard.test.js — a stale tab must not act as another account.
//
// Every account of an org signs in on the same origin, so signing in (or out)
// in one tab swaps the session cookie under every other tab. libs/session-guard
// (A) tells the other tabs at once over BroadcastChannel/localStorage, and (C)
// stamps x-drumee-uid on every same-origin /svc/ fetch so the server refuses a
// stale tab with 412 SESSION_CHANGED — both end on the same blocking card.
//
//   node --test tests/session-guard.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const LIB = path.join(__dirname, "../src/drumee/libs/session-guard.js");
const lib = () => {
  delete require.cache[require.resolve(LIB)];
  return require(LIB);
};

const A = "4900ac004900ac06";
const B = "1fe9136a1fe9137f";
const NOBODY = "ffffffffffffffff";
const ORIGIN = "https://yipejo5194.drumee.in";

// ── isRealUser ──────────────────────────────────────────────────────────────
test("isRealUser: only a 16-hex uid that is not nobody / guest", () => {
  const { isRealUser } = lib();
  assert.equal(isRealUser(A), true);
  assert.equal(isRealUser(NOBODY), false);
  assert.equal(isRealUser("eeeeeeeeeeeeeeee", "eeeeeeeeeeeeeeee"), false);
  assert.equal(isRealUser(""), false);
  assert.equal(isRealUser(undefined), false);
  assert.equal(isRealUser("xyz"), false);
});

// ── decide (A: what a tab does with another tab's announcement) ─────────────
test("decide: same uid, own tab, or a non-user tab → nothing", () => {
  const { decide } = lib();
  assert.equal(decide(A, { uid: A, tab: "t2" }, "t1"), null);
  assert.equal(decide(A, { uid: B, tab: "t1" }, "t1"), null, "own message");
  assert.equal(decide(NOBODY, { uid: B, tab: "t2" }, "t1"), null, "sign-in page");
  assert.equal(decide(A, null, "t1"), null);
  assert.equal(decide(A, { tab: "t2" }, "t1"), null, "no uid");
});

test("decide: another account → other (with its label), nobody → signed_out", () => {
  const { decide } = lib();
  assert.deepEqual(decide(A, { uid: B, label: "h0anghu7n@gmail.com", tab: "t2" }, "t1"),
    { reason: "other", label: "h0anghu7n@gmail.com" });
  assert.deepEqual(decide(A, { uid: NOBODY, tab: "t2" }, "t1"),
    { reason: "signed_out", label: "" });
});

// ── withUidHeader (C: request side) ─────────────────────────────────────────
test("withUidHeader: same-origin /svc/ gets x-drumee-uid, others untouched", () => {
  const { withUidHeader } = lib();
  const [, init] = withUidHeader("/-/huan/svc/media.attributes?nid=1", {}, A, ORIGIN);
  assert.equal(new Headers(init.headers).get("x-drumee-uid"), A);

  const [, abs] = withUidHeader(`${ORIGIN}/-/huan/svc/hub.invite`, { method: "POST",
    headers: { "Content-Type": "application/json" } }, A, ORIGIN);
  const h = new Headers(abs.headers);
  assert.equal(h.get("x-drumee-uid"), A);
  assert.equal(h.get("content-type"), "application/json", "keeps existing headers");
  assert.equal(abs.method, "POST");

  const cross = withUidHeader("https://evil.example/svc/x", {}, A, ORIGIN);
  assert.equal(new Headers(cross[1] && cross[1].headers).get("x-drumee-uid"), null);

  const notSvc = withUidHeader("/-/huan/static/app.js", {}, A, ORIGIN);
  assert.equal(new Headers(notSvc[1] && notSvc[1].headers).get("x-drumee-uid"), null);

  const anon = withUidHeader("/-/huan/svc/yp.get_env", {}, NOBODY, ORIGIN);
  assert.equal(new Headers(anon[1] && anon[1].headers).get("x-drumee-uid"), null);
});

test("withUidHeader: a Request input is rebuilt with the header", () => {
  const { withUidHeader } = lib();
  const req = new Request(`${ORIGIN}/-/huan/svc/media.home`, { headers: { "X-A": "1" } });
  const [out] = withUidHeader(req, undefined, A, ORIGIN);
  assert.equal(out.headers.get("x-drumee-uid"), A);
  assert.equal(out.headers.get("x-a"), "1");
});

// ── isSessionChanged (C: response side) ─────────────────────────────────────
test("isSessionChanged: only 412 + SESSION_CHANGED", () => {
  const { isSessionChanged } = lib();
  assert.equal(isSessionChanged(412, { error: "SESSION_CHANGED" }), true);
  assert.equal(isSessionChanged(412, { error: "OTHER" }), false);
  assert.equal(isSessionChanged(401, { error: "SESSION_CHANGED" }), false);
  assert.equal(isSessionChanged(412, null), false);
});

// ── createGuard: the wired behaviour, with every browser global injected ────
function env(uid = A) {
  const posted = [];
  const stale = [];
  const listeners = {};
  const store = {};
  const calls = [];
  const win = {
    location: { origin: ORIGIN },
    addEventListener(t, f) { (listeners[t] = listeners[t] || []).push(f); },
    fetch: async (input, init) => {
      calls.push([input, init]);
      const url = typeof input === "string" ? input : input.url;
      if (/media\.stale/.test(url)) {
        return new Response(JSON.stringify({ error: "SESSION_CHANGED" }), { status: 412 });
      }
      return new Response("{}", { status: 200 });
    },
    localStorage: {
      setItem(k, v) { store[k] = v; },
      getItem(k) { return store[k] ?? null; },
    },
  };
  class FakeChannel {
    constructor() { this.onmessage = null; FakeChannel.last = this; }
    postMessage(m) { posted.push(m); }
  }
  const g = lib().createGuard({
    win,
    BroadcastChannel: FakeChannel,
    getUid: () => uid,
    onStale: (s) => stale.push(s),
    tabId: "t1",
  });
  return { g, win, posted, stale, listeners, store, calls, FakeChannel };
}

test("announce posts on the channel AND writes the storage key", () => {
  const e = env();
  e.g.announce(B, "h0anghu7n@gmail.com");
  assert.equal(e.posted.length, 1);
  assert.equal(e.posted[0].uid, B);
  assert.equal(e.posted[0].tab, "t1");
  assert.equal(JSON.parse(e.store["drumee:session"]).uid, B);
});

test("listen: a channel message from another account marks the tab stale once", () => {
  const e = env();
  e.g.listen();
  e.FakeChannel.last.onmessage({ data: { uid: B, label: "b@x", tab: "t2" } });
  e.FakeChannel.last.onmessage({ data: { uid: NOBODY, tab: "t3" } });
  assert.deepEqual(e.stale, [{ reason: "other", label: "b@x" }], "idempotent");
});

test("listen: the storage event is the fallback channel", () => {
  const e = env();
  e.g.listen();
  e.listeners.storage[0]({ key: "drumee:session", newValue: JSON.stringify({ uid: NOBODY, tab: "t2" }) });
  e.listeners.storage[0]({ key: "other", newValue: "x" });
  assert.deepEqual(e.stale, [{ reason: "signed_out", label: "" }]);
});

test("listen: the same account in another tab is fine", () => {
  const e = env();
  e.g.listen();
  e.FakeChannel.last.onmessage({ data: { uid: A, tab: "t2" } });
  assert.deepEqual(e.stale, []);
});

test("fetch guard: stamps the header and catches 412 SESSION_CHANGED", async () => {
  const e = env();
  e.g.installFetchGuard();
  await e.win.fetch("/-/huan/svc/media.attributes", {});
  assert.equal(new Headers(e.calls[0][1].headers).get("x-drumee-uid"), A);
  const res = await e.win.fetch("/-/huan/svc/media.stale", {});
  assert.equal(res.status, 412, "original response returned untouched");
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(e.stale, [{ reason: "generic", label: "" }]);
});

test("fetch guard installs once", async () => {
  const e = env();
  e.g.installFetchGuard();
  e.g.installFetchGuard();
  await e.win.fetch("/-/huan/svc/x", {});
  assert.equal(e.calls.length, 1);
});

test("websocket identity check: another user on reconnect is refused", () => {
  const e = env();
  assert.equal(e.g.acceptSocketUser({ id: A }), true);
  assert.equal(e.g.acceptSocketUser({ id: B, email: "b@x" }), false);
  assert.deepEqual(e.stale, [{ reason: "other", label: "b@x" }]);
  const anon = env(NOBODY);
  assert.equal(anon.g.acceptSocketUser({ id: B }), true, "not signed in: adopt");
});

// ── wiring (Tasks 4-5): the boot, sign-out and websocket call the guard ─────
const fs = require("node:fs");
const SRC = (p) => fs.readFileSync(path.join(__dirname, "../src/drumee", p), "utf8");

test("boot: init_globals inits the guard right after Visitor.set(user)", () => {
  const src = SRC("drumee.js");
  const set = src.indexOf("Visitor.set(user);");
  const init = src.indexOf('require("libs/session-guard").init(user)');
  assert.ok(set > 0 && init > set, "init(user) follows Visitor.set(user)");
  assert.ok(init - set < 400, "in the same block");
});

test("sign-out: Butler.logout announces before Visitor.clear()", () => {
  const src = SRC("router/butler/index.js");
  const body = src.slice(src.indexOf("async logout()"));
  const ann = body.indexOf('require("libs/session-guard").announceSignedOut()');
  const clear = body.indexOf("Visitor.clear();");
  assert.ok(ann > 0 && ann < clear, "announce before clear");
});

test("websocket: switchOn asks acceptSocketUser before adopting data.user", () => {
  const src = SRC("router/websocket/index.js");
  const body = src.slice(src.indexOf("switchOn(data)"));
  const ask = body.indexOf("acceptSocketUser(");
  const set = body.indexOf("Visitor.set(data.user)");
  assert.ok(ask > 0 && ask < set, "the identity is checked before Visitor.set");
});
