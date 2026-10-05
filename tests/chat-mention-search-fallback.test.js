// chat-mention-search-fallback.test.js — a typed "/" file mention asks
// media.search_names once; when that search cannot answer (projection not
// built yet, secure-share context, or a non-200 refusal whose body
// ui-essentials already consumed) it lists folders instead of closing the
// dropdown. Every other readable failure still fails closed.
//
//   node --test tests/chat-mention-search-fallback.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const WIDGET = path.join(__dirname, "..", "src/drumee/builtins/widget/chat");
const STUBS = {
  "@drumee/ui-essentials": {},
  "./node-icon": () => "",
  "./skin": {},
  "libs/hub-home": require(path.join(__dirname, "..", "src/drumee/libs/hub-home.js")),
};
const load = Module._load;
Module._load = function (request, parent, isMain) {
  if (Object.prototype.hasOwnProperty.call(STUBS, request)) return STUBS[request];
  return load.call(this, request, parent, isMain);
};
const lex = require(path.join(__dirname, "..", "src/drumee/lex/attribute.js"));
global._ = require("underscore");
global._a = new Proxy(lex, { get: (t, k) => (k in t ? t[k] : k) });
global._e = new Proxy({}, { get: (t, k) => k });
global.SERVICE = { media: { search_names: "media.search_names" } };
global.Visitor = { id: "ME" };
global.LetcBox = class {};
const Chat = require(WIDGET);

const LISTED = [{ nid: "n1", hub_id: "H1", filename: "report" }];

// `answer` is what fetchService resolves with for media.search_names.
function chat(answer, { current = true } = {}) {
  const w = Object.create(Chat.prototype);
  const calls = { search: [], listing: [] };
  Object.assign(w, {
    fetchService: async (opt) => { calls.search.push(opt); return answer; },
    _isFileMentionRequestCurrent: () => current,
    _fetchMentionFiles: async (...args) => { calls.listing.push(args); return LISTED; },
  });
  return { w, calls };
}
const search = (w) => w._searchOrListMentionFiles("H1", "F1", "re", { requestSeq: 1 });

test("a non-200 refusal (fetchService resolves nothing) lists folders, bounded", async () => {
  const { w, calls } = chat(undefined);
  assert.deepEqual(await search(w), LISTED);
  assert.equal(calls.search.length, 1);
  assert.equal(calls.search[0].service, "media.search_names");
  assert.deepEqual(calls.listing, [["H1", "F1", "re", { requestSeq: 1 }, { boundedFallback: true }]]);
});

test("a projection that is not READY yet lists folders", async () => {
  const { w, calls } = chat({ error: "SEARCH_NAMES_PROJECTION_NOT_READY" });
  assert.deepEqual(await search(w), LISTED);
  assert.equal(calls.listing.length, 1);
});

test("secure-share/DMZ context still lists folders", async () => {
  const { w, calls } = chat({ error: "SEARCH_NAMES_UNSUPPORTED_CONTEXT" });
  assert.deepEqual(await search(w), LISTED);
  assert.equal(calls.listing.length, 1);
});

test("any other readable failure stays fail-closed", async () => {
  for (const code of ["FORBIDDEN", "SEARCH_NAMES_TIMEOUT", "INVALID_SEARCH_QUERY"]) {
    const { w, calls } = chat({ error: code });
    await assert.rejects(search(w), (e) => e.code === code);
    assert.equal(calls.listing.length, 0, code);
  }
});

test("a real empty result stays canonical and does not list", async () => {
  const { w, calls } = chat([]);
  assert.deepEqual(await search(w), { rows: [], canonical: true });
  assert.equal(calls.listing.length, 0);
});

test("a superseded request neither falls back nor reports", async () => {
  const { w, calls } = chat(undefined, { current: false });
  assert.deepEqual(await search(w), []);
  assert.equal(calls.listing.length, 0);
});
