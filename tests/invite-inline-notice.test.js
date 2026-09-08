// The invite confirmation is inline, and the panel survives it.
//
// A successful send used to feed Wm.alert({kind:"window_info"}) into the shared
// wrapper-modal, and alert REPLACES what is in there — so the panel the admin
// was working in vanished, taking the matrix they had just changed with it
// ("invite xong panel không cập nhật", 2026-09-08). Swapping alert for info was
// the one repair that could not be made: the panel's full-viewport wrapper sits
// over the toast and eats its Close clicks. So the second surface is gone and
// every outcome is reported at the field.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { renderModule, find } = require("./helpers/render-skeleton.js");

const SRC = join(__dirname, "..", "src/drumee/builtins/permission/restricted/index.js");
const SKEL = "src/drumee/builtins/permission/restricted/skeleton/index.js";

// `_a` is createSafeObject-wrapped at runtime: a missing key returns the key as
// a string, so `_a.open` is "open" and `_a.closed` is "closed" (neither is
// declared in lex/attribute). The skin matches those literals.
const _a = new Proxy({}, { get: (_t, k) => String(k) });
const LOCALE = new Proxy(
  { INVITATION_SENT_SUCCESSFULLY: "sent-ok", TRY_AGAIN: "try-again" },
  { get: (t, k) => (k in t ? t[k] : String(k)) },
);
const SERVICE = { hub: { invite: "hub.invite" } };
const _K = { privilege: { write: 0b0001111 } };

// The framework extends String.prototype; _sendInvitation calls email.isEmail().
// node --test gives each file its own process, so this stays local.
if (!String.prototype.isEmail) {
  String.prototype.isEmail = function () {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(this));
  };
}

// The raw body of a method, for the few cases that need their own wrapper.
function bodyOf(signature) {
  const src = readFileSync(SRC, "utf8");
  const m = src.match(
    new RegExp(`\\n {2}(?:async )?${signature.replace(/[()]/g, "\\$&")} \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`),
  );
  assert.ok(m, `${signature} not found`);
  return m[1];
}

function lift(signature, globals) {
  const src = readFileSync(SRC, "utf8");
  const m = src.match(
    new RegExp(`\\n {2}(?:async )?${signature.replace(/[()]/g, "\\$&")} \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`),
  );
  assert.ok(m, `${signature} not found`);
  const names = Object.keys(globals);
  const args = signature.slice(signature.indexOf("(") + 1, signature.lastIndexOf(")"));
  return new Function(
    ...names,
    `return async function (${args}) {\n${m[1]}\n};`,
  )(...names.map((n) => globals[n]));
}

// A panel whose invite field holds `typed`, with one member already.
// `response` is read through arguments.length, not a default parameter: the
// swallowed-rejection case has to resolve a literal `undefined`, which a
// default would quietly replace with the success payload.
function panel(typed = "new@x.com", response) {
  const answer =
    arguments.length < 2 ? { results: [{ status: "ok" }] } : response;
  const filled = [];
  const p = {
    _members: [{ entity_id: "me", email: "owner@x.com" }],
    _inviteNotice: null,
    _inviteRole: null,
    filled,
    broadcasts: [],
    posts: [],
    alerts: [],
    mget: () => "h1",
    getPart: () => ({ el: { dataset: {} }, set() {} }),
    _getInviteEmail: () => typed,
    _emailIsMember(email) {
      return this._members.some((r) => r.email === email);
    },
    postService(service, payload) {
      this.posts.push({ service, payload });
      return Promise.resolve(answer);
    },
  };
  // The real helpers, lifted, so the notice/tone contract is the shipped one.
  p._setInviteNotice = lift("_setInviteNotice(text, tone = \"error\")", { _a });
  p._setInviteError = lift("_setInviteError(reason)", {});
  return p;
}

const send = (p) =>
  lift("_sendInvitation(cmd)", {
    LOCALE,
    SERVICE,
    _a,
    _K,
    RADIO_BROADCAST: { trigger: (n, d) => p.broadcasts.push({ n, d }) },
    fillEntry: (part, v) => p.filled.push(v),
    // Any modal at all is the bug this replaced.
    Wm: { alert: () => assert.fail("_sendInvitation must not open a modal") },
  }).call(p, { el: { dataset: {} } });

// ── the send path ─────────────────────────────────────────────────────────

test("a successful invite reports success inline, with no modal", async () => {
  const p = panel();
  await send(p);

  assert.deepEqual(p._inviteNotice, { text: "sent-ok", tone: "success" });
  assert.equal(p.posts.length, 1);
  assert.equal(p.posts[0].service, "hub.invite");
  assert.deepEqual(p.posts[0].payload.invitees, ["new@x.com"]);
});

test("the field is emptied so a second click cannot re-send", async () => {
  const p = panel();
  await send(p);
  // "" — and the address is about to become a member, which _emailIsMember
  // would otherwise answer with "already has access" on the next click.
  assert.deepEqual(p.filled, [""]);
});

test("the invitation:sent broadcast still fires — the guides run on it", async () => {
  const p = panel();
  await send(p);
  assert.equal(p.broadcasts.length, 1);
  assert.equal(p.broadcasts[0].n, "invitation:sent");
  assert.deepEqual(p.broadcasts[0].d, { hub_id: "h1" });
});

test("a server error payload reports inline as an error, not a success", async () => {
  const p = panel("new@x.com", { error: "NOPE", reason: "seat limit" });
  await send(p);

  assert.deepEqual(p._inviteNotice, { text: "seat limit", tone: "error" });
  assert.deepEqual(p.broadcasts, []);
  assert.deepEqual(p.filled, []);
});

test("a per-invitee failure reports inline as an error", async () => {
  const p = panel("new@x.com", { results: [{ status: "failed", reason: "bad address" }] });
  await send(p);

  assert.deepEqual(p._inviteNotice, { text: "bad address", tone: "error" });
  assert.deepEqual(p.broadcasts, []);
});

test("a swallowed rejection is NOT reported as a sent invitation", async () => {
  // doRequest hands a non-200 to onServerComplain, which only warns, and
  // postService then resolves undefined.
  const p = panel("new@x.com", undefined);
  await send(p);

  assert.deepEqual(p._inviteNotice, { text: "try-again", tone: "error" });
  assert.deepEqual(p.broadcasts, []);
  assert.deepEqual(p.filled, []);
});

test("validation still refuses before any request", async () => {
  for (const typed of ["", "not-an-email"]) {
    const p = panel(typed);
    await send(p);
    assert.equal(p.posts.length, 0, `posted for ${JSON.stringify(typed)}`);
    assert.equal(p._inviteNotice.tone, "error");
  }
  const dup = panel("owner@x.com");
  await send(dup);
  assert.equal(dup.posts.length, 0);
  assert.equal(dup._inviteNotice.tone, "error");
});

// ── the notice survives the repaint that follows it ───────────────────────

test("the notice is state, so hub.member_joined cannot erase it", async () => {
  const p = panel();
  await send(p);
  // _loadMembers re-feeds the whole skeleton a second later; the skeleton reads
  // this, so the confirmation is redrawn rather than wiped by its own success.
  assert.equal(p._inviteNotice.tone, "success");
});

const ui = (over) => ({
  fig: { family: "permission-restricted", group: "permission" },
  mget: () => null,
  _membersLoaded: true,
  _members: [{ entity_id: "me", email: "me@x", fullname: "Me", privilege: 63 }],
  _inviteRole: null,
  _inviteNotice: null,
  ...over,
});
const slot = (over) => {
  const t = renderModule(SKEL, ui(over));
  return {
    box: find(t, "permission-restricted__invite-error"),
    msg: find(t, "permission-restricted__invite-error-message"),
  };
};

test("no notice renders the slot closed and empty", () => {
  const { box, msg } = slot();
  assert.equal(box.dataset.state, "closed");
  assert.equal(msg.content, "");
});

test("a success notice renders open, green-toned, with its text", () => {
  const { box, msg } = slot({ _inviteNotice: { text: "sent-ok", tone: "success" } });
  assert.equal(box.dataset.state, "open");
  assert.equal(box.dataset.tone, "success");
  assert.equal(msg.content, "sent-ok");
});

test("an error notice renders open in the error tone", () => {
  const { box, msg } = slot({ _inviteNotice: { text: "bad address", tone: "error" } });
  assert.equal(box.dataset.state, "open");
  assert.equal(box.dataset.tone, "error");
  assert.equal(msg.content, "bad address");
});

test("a non-admin viewer gets no invite section at all", () => {
  // privilege 7 = view/chat, no admin bit — the gate that decides this is
  // unchanged, and the notice must not smuggle the form back in.
  const { box } = slot({
    _members: [{ entity_id: "me", email: "me@x", fullname: "Me", privilege: 7 }],
    _inviteNotice: { text: "sent-ok", tone: "success" },
  });
  assert.equal(box, null);
});

// ── the repaint that lands mid-invite must not eat what is being typed ─────

test("_render carries a half-typed address across the re-feed", () => {
  const restored = [];
  const p = {
    _inviteNotice: null,
    feed() { this.fed = true; },
    getPart: () => ({ el: { querySelector: () => ({ value: "  next@x.com  " }) } }),
    ensurePart: () => Promise.resolve("part"),
  };
  const render = new Function(
    "require",
    "fillEntry",
    `return function () {\n${bodyOf("_render()")}\n};`,
  )(() => () => ({}), (part, v) => restored.push([part, v]));
  p._inviteDraft = new Function("", `return function () {\n${bodyOf("_inviteDraft()")}\n};`)();

  render.call(p);
  assert.equal(p.fed, true);
  return Promise.resolve().then(() => {
    assert.deepEqual(restored, [["part", "next@x.com"]]);
  });
});

test("_render leaves focus alone when there is nothing typed", () => {
  const restored = [];
  const p = {
    _inviteNotice: null,
    feed() {},
    getPart: () => ({ el: { querySelector: () => ({ value: "" }) } }),
    ensurePart: () => assert.fail("must not touch the field with no draft"),
  };
  const render = new Function(
    "require",
    "fillEntry",
    `return function () {\n${bodyOf("_render()")}\n};`,
  )(() => () => ({}), (part, v) => restored.push([part, v]));
  p._inviteDraft = new Function("", `return function () {\n${bodyOf("_inviteDraft()")}\n};`)();

  render.call(p);
  assert.deepEqual(restored, []);
});

test("a viewer with no invite section has no draft to lose", () => {
  const draft = new Function("", `return function () {\n${bodyOf("_inviteDraft()")}\n};`)();
  assert.equal(draft.call({ getPart: () => null }), "");
  assert.equal(draft.call({}), "");
});
