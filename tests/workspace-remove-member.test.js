// "Who has access" → Permission Matrix → trash icon did nothing: the panel
// POSTed SERVICE.hub.remove_member, which is not a registered service, so the
// name resolved to `undefined`, the request was rejected, the rejection was
// swallowed by the default onServerComplain, and the panel then re-read the
// member list — leaving the member listed and still holding access.
//
// These run the real _removeMember body against a stub `this`, so a rename back
// to a non-existent service, a reverted payload shape, or a reintroduced
// read-after-write refetch fails here instead of silently on the endpoint.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SRC = join(
  __dirname,
  "..",
  "src/drumee/builtins/permission/restricted/index.js",
);

// Only the services the panel is allowed to name. A wrong key reads as
// `undefined` here exactly as it did in the browser.
const SERVICE = {
  hub: {
    delete_contributor: "hub.delete_contributor",
    get_members_by_type: "hub.get_members_by_type",
    set_privilege: "hub.set_privilege",
    invite: "hub.invite",
  },
};
const LOCALE = { TRY_AGAIN: "Something went wrong. Please try again." };
const _a = { hub_id: "hub_id" };

// Lift the method body out of the class so it runs without booting Skeletons.
function loadRemoveMember(Wm, Visitor) {
  const src = readFileSync(SRC, "utf8");
  const m = src.match(/\n {2}async _removeMember\(cmd\) \{\n([\s\S]*?)\n {2}\}\n/);
  assert.ok(m, "_removeMember not found");
  return new Function(
    "Wm",
    "LOCALE",
    "SERVICE",
    "Visitor",
    "_a",
    `return async function (cmd) {\n${m[1]}\n};`,
  )(Wm, LOCALE, SERVICE, Visitor, _a);
}

// A panel showing owner "u1" (the viewer) and member "u2".
function panel(postService) {
  const members = [
    { entity_id: "u1", fullname: "Owner", privilege: 31 },
    { entity_id: "u2", fullname: "Bob", privilege: 7 },
  ];
  return {
    _members: members,
    _confirmInFlight: false,
    renders: 0,
    fetches: [],
    mget: (k) => (k === "hub_id" ? "hub42" : undefined),
    _render() {
      this.renders += 1;
    },
    fetchService(service, payload) {
      this.fetches.push({ service, payload });
      return Promise.resolve(this._members);
    },
    postService,
    _findMemberRow(id) {
      return this._members.find((r) => String(r.entity_id) === String(id)) || null;
    },
    _formatMemberName: (row) => row.fullname,
  };
}

const cmd = (id) => ({ el: { dataset: { member_id: id } } });
const ids = (p) => p._members.map((r) => r.entity_id);

const confirmYes = () => {
  const alerts = [];
  return [{ confirm: () => Promise.resolve(), alert: (m) => alerts.push(m) }, alerts];
};

test("removing a member calls hub.delete_contributor with a users array", async () => {
  const [Wm, alerts] = confirmYes();
  const calls = [];
  const p = panel(function (service, payload) {
    calls.push({ service, payload });
    // The service answers with the remaining members.
    return Promise.resolve([{ entity_id: "u1" }]);
  });
  await loadRemoveMember(Wm, { id: "u1" }).call(p, cmd("u2"));

  assert.equal(calls.length, 1);
  assert.equal(calls[0].service, "hub.delete_contributor");
  assert.deepEqual(calls[0].payload, { hub_id: "hub42", users: ["u2"] });
  assert.deepEqual(alerts, []);
});

test("the removed row is spliced locally, never re-read from the server", async () => {
  const [Wm] = confirmYes();
  const p = panel(() => Promise.resolve([{ entity_id: "u1" }]));
  await loadRemoveMember(Wm, { id: "u1" }).call(p, cmd("u2"));

  assert.deepEqual(ids(p), ["u1"]);
  assert.equal(p.renders, 1);
  // hub.get_members_by_type still answers with the pre-write rows right after
  // the write; a refetch here is what put the member back on screen.
  assert.deepEqual(p.fetches, []);
});

test("a swallowed rejection keeps the member and reports it", async () => {
  const [Wm, alerts] = confirmYes();
  // doRequest hands a non-200 to onServerComplain and resolves undefined.
  const p = panel(() => Promise.resolve(undefined));
  await loadRemoveMember(Wm, { id: "u1" }).call(p, cmd("u2"));

  assert.deepEqual(ids(p), ["u1", "u2"]);
  assert.deepEqual(alerts, [LOCALE.TRY_AGAIN]);
  assert.equal(p.renders, 0);
});

test("a 200 carrying an error payload keeps the member and reports it", async () => {
  const [Wm, alerts] = confirmYes();
  const p = panel(() => Promise.resolve({ error: "NOT_ALLOWED", reason: "nope" }));
  await loadRemoveMember(Wm, { id: "u1" }).call(p, cmd("u2"));

  assert.deepEqual(ids(p), ["u1", "u2"]);
  assert.deepEqual(alerts, ["nope"]);
});

test("cancelling the confirmation removes nobody", async () => {
  const alerts = [];
  const Wm = { confirm: () => Promise.reject(new Error("cancel")), alert: (m) => alerts.push(m) };
  let called = 0;
  const p = panel(() => {
    called += 1;
    return Promise.resolve([]);
  });
  await loadRemoveMember(Wm, { id: "u1" }).call(p, cmd("u2"));

  assert.equal(called, 0);
  assert.deepEqual(ids(p), ["u1", "u2"]);
  assert.equal(p._confirmInFlight, false);
});

test("the viewer cannot remove themselves", async () => {
  const [Wm] = confirmYes();
  let called = 0;
  const p = panel(() => {
    called += 1;
    return Promise.resolve([]);
  });
  await loadRemoveMember(Wm, { id: "u1" }).call(p, cmd("u1"));

  assert.equal(called, 0);
  assert.deepEqual(ids(p), ["u1", "u2"]);
});
