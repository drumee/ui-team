#!/usr/bin/env node

// Regression cover for `ensureElement`, patched into @drumee/ui-core by
// patches/@drumee+ui-core+1.1.50.patch.
//
// The poll used to assign its lookup back into `el`. Combined with the
// leading-edge f() call, an id handed over before its element was attached
// -- which is exactly what builtins/player/video does from onPartReady --
// nulled `el` on the first miss, so no later tick ever looked the id up
// again and the promise rejected after running out its ticks. waitElement
// swallows that rejection, so the video player simply never started: a
// blank <video>, no request, no error.
//
// The real shipped function is lifted out of node_modules and run against
// stub globals, so this fails if the patch is dropped or regenerated wrong.

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SOURCE = join(
  __dirname,
  "..",
  "node_modules/@drumee/ui-core/letc/addons/letc.js",
);

function loadEnsureElement(documentStub) {
  const source = readFileSync(SOURCE, "utf8");
  const marker = "View.prototype.ensureElement = function (el) {";
  const start = source.indexOf(marker);
  assert.notEqual(start, -1, "ensureElement not found in ui-core");
  // The function is the last thing before a column-0 closing brace.
  const end = source.indexOf("\n}\n", start);
  assert.notEqual(end, -1, "ensureElement has no closing brace");
  const body = source.slice(start, end + 3);

  let seq = 0;
  const _ = {
    uniqueId: () => `t${++seq}`,
    isString: (v) => typeof v === "string",
  };
  const Timer = new Map();
  const View = { prototype: {} };
  // eslint-disable-next-line no-new-func
  new Function("View", "_", "Timer", "document", body)(
    View,
    _,
    Timer,
    documentStub,
  );
  return { ensureElement: View.prototype.ensureElement, Timer };
}

function fakeDocument() {
  const byId = new Map();
  return {
    getElementById: (id) => byId.get(id) || null,
    add: (id) => {
      const el = { id, isConnected: true };
      byId.set(id, el);
      return el;
    },
  };
}

test("an id whose element attaches after the first tick still resolves", async () => {
  const doc = fakeDocument();
  const { ensureElement } = loadEnsureElement(doc);

  const pending = ensureElement.call({}, "video-1");
  // The player's <video> lands roughly a frame later; well inside the poll.
  setTimeout(() => doc.add("video-1"), 400);

  const el = await pending;
  assert.equal(el.id, "video-1");
});

test("an id already in the document resolves without arming the poll", async () => {
  const doc = fakeDocument();
  doc.add("video-2");
  const { ensureElement, Timer } = loadEnsureElement(doc);

  const el = await ensureElement.call({}, "video-2");
  assert.equal(el.id, "video-2");
  assert.equal(Timer.size, 0, "leading-edge call should settle it outright");
});

test("an id that never appears still rejects, and stops polling", async () => {
  const doc = fakeDocument();
  const { ensureElement, Timer } = loadEnsureElement(doc);

  await assert.rejects(() => ensureElement.call({}, "video-missing"));
  assert.equal(Timer.size, 0, "timer must be cleared on rejection");
});

test("a detached element object resolves as before", async () => {
  const doc = fakeDocument();
  const { ensureElement } = loadEnsureElement(doc);

  const detached = { id: "d", isConnected: false };
  assert.equal(await ensureElement.call({}, detached), detached);
});

test("an attached element short-circuits on isConnected", async () => {
  const doc = fakeDocument();
  const { ensureElement, Timer } = loadEnsureElement(doc);

  const attached = { id: "a", isConnected: true };
  assert.equal(await ensureElement.call({}, attached), attached);
  assert.equal(Timer.size, 0);
});

test("a jQuery handle is unwrapped to its element", async () => {
  const doc = fakeDocument();
  const { ensureElement } = loadEnsureElement(doc);

  const node = { id: "j", isConnected: false };
  const handle = { jquery: "3.x", 0: node };
  assert.equal(await ensureElement.call({}, handle), node);
});
