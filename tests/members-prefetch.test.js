// Opening Access used to cost two round trips back to back: the click started
// a dynamic import() of the panel's chunk, and only once that landed did the
// mounted panel ask for the members. On a link where a round trip is ~0.5s
// that is a second of waiting for ~1ms of database work.
//
// This is the overlap: the click starts the members request itself, so the
// code download and the data fetch run at the same time, and the panel takes
// the answer that is already on its way instead of starting a second one.
const assert = require("node:assert/strict");
const test = require("node:test");

global.SERVICE = { hub: { get_members_by_type: "hub.get_members_by_type" } };

const {
  prefetchMembers,
  membersFor,
  takeMembers,
} = require("../src/drumee/libs/members-prefetch");

// A view that records its calls and lets the test settle each one by hand.
function viewer() {
  const calls = [];
  return {
    calls,
    fetchService(service, params) {
      let settle;
      const p = new Promise((res, rej) => { settle = { res, rej }; });
      calls.push({ service, params, ...settle });
      return p;
    },
  };
}

test("the prefetch asks for this workspace's members, uncached", () => {
  const v = viewer();
  prefetchMembers(v, "hub-1");
  assert.equal(v.calls.length, 1);
  const { service, params } = v.calls[0];
  assert.equal(service, "hub.get_members_by_type");
  assert.equal(params.hub_id, "hub-1");
  assert.equal(params.type, "all");
  // fetchService GETs are HTTP-cacheable, and a stale answer here is a stale
  // permissions matrix — the same cache-buster the panel's own call carries.
  assert.ok(params._ts, "no cache-buster");
  takeMembers("hub-1");
});

test("a second prefetch joins the one already in flight", () => {
  const v = viewer();
  const a = prefetchMembers(v, "hub-2");
  const b = prefetchMembers(v, "hub-2");
  assert.equal(v.calls.length, 1, "asked twice");
  assert.equal(a, b);
  takeMembers("hub-2");
});

test("the panel takes the answer already on its way", async () => {
  const v = viewer();
  prefetchMembers(v, "hub-3");
  const rows = membersFor(v, "hub-3");
  assert.equal(v.calls.length, 1, "the panel started a second request");
  v.calls[0].res([{ id: "u1" }]);
  assert.deepEqual(await rows, [{ id: "u1" }]);
});

test("it is one-shot: the next load fetches fresh", async () => {
  const v = viewer();
  prefetchMembers(v, "hub-4");
  membersFor(v, "hub-4");
  v.calls[0].res([]);
  membersFor(v, "hub-4");
  assert.equal(v.calls.length, 2, "a later load reused a spent prefetch");
  v.calls[1].res([]);
});

test("with nothing prefetched the panel just asks", async () => {
  const v = viewer();
  const rows = membersFor(v, "hub-5");
  assert.equal(v.calls.length, 1);
  v.calls[0].res([{ id: "u9" }]);
  assert.deepEqual(await rows, [{ id: "u9" }]);
});

test("a prefetch that failed is retried by the panel, not inherited", async () => {
  // The prefetch runs earlier than the panel's own call ever did, so it can
  // lose a race the panel would win. A failed head start must not cost the
  // user the matrix.
  const v = viewer();
  prefetchMembers(v, "hub-6");
  const rows = membersFor(v, "hub-6");
  v.calls[0].rej(new Error("nope"));
  await Promise.resolve();
  assert.equal(v.calls.length, 2, "no retry after a failed prefetch");
  v.calls[1].res([{ id: "u2" }]);
  assert.deepEqual(await rows, [{ id: "u2" }]);
});

test("a failure with nothing prefetched still reaches the caller", async () => {
  const v = viewer();
  const rows = membersFor(v, "hub-7");
  v.calls[0].rej(new Error("nope"));
  await assert.rejects(rows, /nope/);
});

test("nothing is requested without a workspace, or without a view", () => {
  const v = viewer();
  assert.equal(prefetchMembers(v, ""), null);
  assert.equal(prefetchMembers(null, "hub-8"), null);
  assert.equal(prefetchMembers({}, "hub-8"), null);
  assert.equal(v.calls.length, 0);
});

// A prefetch is only ever a HEAD START on the click that made it. One nobody
// took — Access pressed, the window closed before the chunk landed — is left
// parked, and handing that answer to a click minutes later would show a
// permissions matrix from before whatever happened in between. Only a request
// still in flight is worth sharing.
test("a later click never inherits an answer left over from an earlier one", async () => {
  const v = viewer();
  prefetchMembers(v, "hub-stale");
  v.calls[0].res([{ id: "old" }]);
  await new Promise((r) => setImmediate(r));

  prefetchMembers(v, "hub-stale");
  assert.equal(v.calls.length, 2, "a settled prefetch was reused");
  const rows = membersFor(v, "hub-stale");
  v.calls[1].res([{ id: "new" }]);
  assert.deepEqual(await rows, [{ id: "new" }], "the panel got the stale answer");
});

test("a request still in flight is shared, however long it takes", async () => {
  const v = viewer();
  const a = prefetchMembers(v, "hub-slow");
  await new Promise((r) => setImmediate(r));
  const b = prefetchMembers(v, "hub-slow");
  assert.equal(v.calls.length, 1, "duplicated a request already in flight");
  assert.equal(a, b);
  v.calls[0].res([]);
  await a;
  takeMembers("hub-slow");
});
