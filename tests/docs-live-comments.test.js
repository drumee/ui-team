// docs-live-comments.test.js — Casual Docs co-editing (Live) saves:
// comment threads written into the saved file, an idle room not re-saved on
// every autosave tick (editor/docs/live-comments.js, editor/docs/collab.js).
//   node --test tests/docs-live-comments.test.js
//
// Casual's own functions are faked; they were exercised for real against
// @casualoffice/docs 1.4.2 + yjs while writing this (attemptSelectiveSave adds
// word/comments.xml and leaves word/document.xml byte-identical; parseDocx
// reads the threads back, replies included).
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const Module = require("node:module");

const realResolve = Module._resolveFilename;
Module._resolveFilename = function (request, ...rest) {
  if (request === "builtins/editor/content-url") return path.join(__dirname, "__stub_content_url__.js");
  return realResolve.call(this, request, ...rest);
};
require.cache[path.join(__dirname, "__stub_content_url__.js")] = {
  id: "stub", filename: "stub", loaded: true,
  exports: { contentUrl: () => "https://example.test/file" },
};
global.SERVICE = { media: { save: "media.save", rename: "media.rename", trash: "media.trash" } };
global.LOCALE = { TAB: "Tab" };

const LC = require("../src/drumee/builtins/editor/docs/live-comments");
const collab = require("../src/drumee/builtins/editor/docs/collab");

// A Y.Map stand-in: forEach / size / set / doc.transact.
function fakeMap(entries = {}) {
  const m = new Map(Object.entries(entries));
  return {
    forEach: (cb) => m.forEach((v, k) => cb(v, k)),
    get size() { return m.size; },
    set: (k, v) => m.set(k, v),
    keys: () => m.keys(),
    get: (k) => m.get(k),
    doc: { transact: (fn) => fn() },
  };
}
const buf = (s) => new TextEncoder().encode(s).buffer;

test("liveComments: real threads only, oldest id first", () => {
  const map = fakeMap({ "-1": { id: -1 }, b: { id: 1000002 }, a: { id: 1000001 }, junk: "x" });
  assert.deepEqual(LC.liveComments(map).map((c) => c.id), [1000001, 1000002]);
  assert.deepEqual(LC.liveComments(null), []);
});

test("withComments hands the threads to Casual's selective save, untouched bytes otherwise", async () => {
  const bytes = buf("docx");
  const calls = [];
  const saver = async (doc, b, opts) => (calls.push([doc, opts]), buf("docx+comments"));
  const out = await LC.withComments(bytes, fakeMap({ 1: { id: 1, author: "Ann", content: [] } }), saver);
  assert.equal(new TextDecoder().decode(out), "docx+comments");
  assert.deepEqual(calls[0][0].package.document.comments.map((c) => c.author), ["Ann"]);
  // document.xml must stay as exported: no paragraph is rewritten
  assert.equal(calls[0][1].changedParaIds.size, 0);
  assert.equal(calls[0][1].structuralChange, false);
  assert.equal(await LC.withComments(bytes, fakeMap({}), saver), bytes, "no threads");
  assert.equal(await LC.withComments(bytes, fakeMap({ 1: { id: 1 } }), async () => { throw new Error("x"); }), bytes, "a failing saver");
  assert.equal(await LC.withComments(bytes, fakeMap({ 1: { id: 1 } }), async () => null), bytes, "a refusing saver");
});

test("seedComments fills an EMPTY room from the file, never a room that has threads", async () => {
  const parse = async () => ({ package: { document: { comments: [{ id: 5, author: "Ann" }, { id: -1 }, { id: 6, parentId: 5 }] } } });
  const empty = fakeMap({});
  assert.equal(await LC.seedComments(empty, buf("x"), parse), 2);
  assert.deepEqual([...empty.keys()], ["5", "6"]);
  const busy = fakeMap({ 9: { id: 9 } });
  assert.equal(await LC.seedComments(busy, buf("x"), parse), 0);
  assert.deepEqual([...busy.keys()], ["9"]);
  assert.equal(await LC.seedComments(fakeMap({}), buf("x"), async () => { throw new Error("bad docx"); }), 0);
});

test("peerCommentIdBase stays inside OOXML's 32-bit ids", () => {
  for (const r of [0, 0.42, 0.999999]) {
    const base = LC.peerCommentIdBase(() => r);
    assert.ok(base >= 1e6 && base + 1e6 < 2 ** 31, String(base));
  }
});

function fileSourceWith(ctx = {}) {
  const posts = [];
  const statuses = [];
  const editor = {
    postService: async (opt) => (posts.push(opt), { nid: opt.nid, hub_id: opt.hub_id }),
    setSaveStatus: (s) => statuses.push(s),
    mset() {},
  };
  const fs = collab.makeFileSource(editor, { hub_id: "h1", pid: "p1", filename: () => "Doc", ...ctx });
  return { fs, posts, statuses };
}

test("an idle room is not re-saved on an autosave tick; a manual save always goes out", async () => {
  const { fs, posts, statuses } = fileSourceWith({ isIdle: () => true });
  const before = Date.now();
  const r = await fs.save("n1", buf("docx"));
  assert.equal(posts.length, 0);
  assert.equal(r.id, "n1");
  assert.equal(statuses.at(-1), "saved");
  assert.ok(fs.lastSaveAt("n1") >= before, "the tick still counts as a save of the room");
  await fs.save("n1", buf("docx"), { manual: 1 });
  assert.equal(posts.length, 1);
});

test("a changed room saves the bytes with its comments, then reports the save", async () => {
  const saved = [];
  const { fs, posts } = fileSourceWith({
    isIdle: () => false,
    prepareBytes: async (room, bytes) => buf(`${new TextDecoder().decode(bytes)}+comments`),
    onSaved: (room, startedAt) => saved.push([room, typeof startedAt]),
  });
  await fs.save("n1", buf("docx"));
  assert.equal(posts.length, 1);
  const body = JSON.parse(posts[0].content);
  assert.equal(Buffer.from(body.docx, "base64").toString(), "docx+comments");
  assert.deepEqual(saved, [["n1", "number"]]);
});

test("without the hooks (single-user callers) a save behaves as before", async () => {
  const { fs, posts } = fileSourceWith();
  await fs.save("n1", buf("docx"));
  assert.equal(posts.length, 1);
  assert.equal(Buffer.from(JSON.parse(posts[0].content).docx, "base64").toString(), "docx");
});

test("open() reports the bytes a room starts from", async () => {
  global.fetch = async () => ({ ok: true, text: async () => JSON.stringify({ docx: Buffer.from("stored").toString("base64") }) });
  const opened = [];
  const { fs } = fileSourceWith({ onOpened: (room, bytes) => opened.push([room, Buffer.from(bytes).toString()]) });
  await fs.open("n1");
  assert.deepEqual(opened, [["n1", "stored"]]);
});
