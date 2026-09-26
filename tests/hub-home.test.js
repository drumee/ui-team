const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

global.SERVICE = { media: { home: "media.home" } };
const readCache = require(path.join(__dirname, "..", "src/drumee/libs/read-cache.js"));
const hubHome = require(path.join(__dirname, "..", "src/drumee/libs/hub-home.js"));

function view(answer) {
  const calls = [];
  let release;
  const gate = new Promise((r) => (release = r));
  return {
    calls,
    release: () => release(),
    fetchService: async (o) => {
      calls.push(o);
      await gate;
      return typeof answer === "function" ? answer() : answer;
    },
  };
}

test.beforeEach(() => readCache.clear());

test("warm() and get() share ONE in-flight media.home request", async () => {
  const v = view({ chat_upload_id: "U1", name: "WS" });
  hubHome.warm(v, "H1");
  const p = hubHome.get(v, "H1");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(v.calls.length, 1);
  assert.deepEqual(v.calls[0], { service: "media.home", hub_id: "H1" });
  v.release();
  assert.equal((await p).chat_upload_id, "U1");
});

test("a remembered answer resolves at once and revalidates in the background", async () => {
  const first = view({ chat_upload_id: "U1" });
  first.release();
  await hubHome.get(first, "H2");

  const second = view({ chat_upload_id: "U1" });
  const got = await hubHome.get(second, "H2"); // gate still closed
  assert.equal(got.chat_upload_id, "U1");
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(second.calls.length, 1, "revalidation request sent");
  second.release();
});

test("an empty answer is not remembered", async () => {
  const v = view({});
  v.release();
  await hubHome.get(v, "H3");
  assert.equal(readCache.peek("media.home:H3"), undefined);
  const again = view({ chat_upload_id: "U3" });
  again.release();
  assert.equal((await hubHome.get(again, "H3")).chat_upload_id, "U3");
  assert.equal(again.calls.length, 1);
});
