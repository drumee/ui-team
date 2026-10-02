// open-media.test.js — opening a file's player from anywhere (not only from a
// window): the branch extracted from window/utils openFileLocation, shared by
// it and the Inbox's Chat details.
//
//   node --test tests/open-media.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const Module = require("node:module");

global._a = new Proxy({}, { get: (t, k) => k });
global.SERVICE = { media: { attributes: "media.attributes" } };
global.LOCALE = { FILE_NOT_FOUND: "File not found" };
global.Backbone = { Model: class { constructor(a) { this.attributes = a; } } };
const launched = [];
const alerts = [];
global.Wm = { launch: (o, x) => { launched.push([o, x]); return true; }, alert: (m) => alerts.push(m) };
global.Kind = { waitFor: async () => class Media { constructor(o) { this.opt = o; } } };
const _load = Module._load;
Module._load = function (r, ...a) {
  if (r === "window/configs/application") {
    return (filetype, data) => (filetype === "image" || data.filetype === "image" ? { kind: "player_image" } : {});
  }
  return _load.call(this, r, ...a);
};
const { openMedia, CONTAINER_FILETYPES } = require("../src/drumee/libs/open-media");

const reset = () => { launched.length = 0; alerts.length = 0; };

test("fetches the node when filetype is unknown, then launches its player with a media", async () => {
  reset();
  const asked = [];
  const fetchService = async (args) => { asked.push(args); return { nid: "n1", hub_id: "h1", filetype: "image" }; };
  const r = await openMedia({ nid: "n1", hub_id: "h1" }, { fetchService });
  assert.equal(r, true);
  assert.deepEqual(asked[0], { service: "media.attributes", nid: "n1", hub_id: "h1" });
  assert.equal(launched[0][0].kind, "player_image");
  assert.equal(launched[0][0].nid, "n1");
  assert.ok(launched[0][0].media, "the player gets a media node to read content through");
  assert.deepEqual(launched[0][1], { explicit: 1 });
});

test("a gone node alerts instead of launching", async () => {
  reset();
  const r = await openMedia({ nid: "n1", hub_id: "h1" }, { fetchService: async () => ({}) });
  assert.equal(launched.length, 0);
  assert.deepEqual(alerts, ["File not found"]);
  assert.equal(r, undefined);
});

test("no player for the type → null, nothing launched", async () => {
  reset();
  const r = await openMedia({ nid: "n1", hub_id: "h1", filetype: "folder" }, { fetchService: async () => ({ nid: "n1", filetype: "folder" }) });
  assert.equal(r, null);
  assert.equal(launched.length, 0);
});

test("containers never get a media node built for them", () => {
  assert.ok(CONTAINER_FILETYPES.includes("folder"));
  assert.ok(CONTAINER_FILETYPES.includes("hub"));
});
