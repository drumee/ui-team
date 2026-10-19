// tests/text-player-confirm-leave.test.js — switching file from the text
// player's Open-File Switcher asks first when the text has unsaved edits.
//
//   node --test tests/text-player-confirm-leave.test.js
//
// The player only loads under webpack, so the REAL method is sliced out and
// run against a stub `this`.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/player/text/index.js"),
  "utf8"
);
const LOCALES = ["en", "fr", "es", "ru", "zh", "km"];

global._a = { content: "content" };
global.LOCALE = {
  UNSAVED_CHANGES: "Unsaved changes",
  FILE_SWITCHER_UNSAVED_DESC: "desc",
  LEAVE: "Leave",
  CANCEL: "Cancel",
};

const confirmLeave = () =>
  new Function(`return ${sliceFunction(SRC, "async confirmLeave()")}`)();

// `saved` is the text as last loaded or saved (the baseline); the model's
// content is deliberately stale, as it is after a save.
function player(saved, typed) {
  return {
    mget: (k) => (k === "content" ? "stale" : undefined),
    _savedText: saved,
    __textContent: { el: { value: typed } },
  };
}

function stubConfirm(resolve) {
  const calls = [];
  global.Wm = {
    confirm: (opt) => {
      calls.push(opt);
      return resolve ? Promise.resolve() : Promise.reject(new Error("cancel"));
    },
  };
  return calls;
}

test("unchanged text leaves without asking", async () => {
  const calls = stubConfirm(true);
  assert.equal(await confirmLeave().call(player("abc", "abc")), true);
  assert.equal(calls.length, 0);
});

test("edited text + Leave → true", async () => {
  const calls = stubConfirm(true);
  assert.equal(await confirmLeave().call(player("abc", "abcd")), true);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].title, LOCALE.UNSAVED_CHANGES);
});

test("edited text + Cancel → false", async () => {
  stubConfirm(false);
  assert.equal(await confirmLeave().call(player("abc", "abcd")), false);
});

test("text not loaded yet leaves without asking", async () => {
  const calls = stubConfirm(true);
  assert.equal(await confirmLeave().call(player(undefined, "")), true);
  assert.equal(calls.length, 0);
});

test("a save moves the baseline to the saved text", async () => {
  const save = new Function(`return ${sliceFunction(SRC, "_saveContent(opt, target)")}`)();
  const self = {
    postService: async () => ({ nid: 7, file_path: "/a.txt" }),
    ensurePart: () => new Promise(() => {}),
    mset() {},
  };
  save.call(self, { content: "new text" }, { getItemsByAttr: () => [] });
  await new Promise((r) => setImmediate(r));
  assert.equal(self._savedText, "new text");
});

test("every locale has FILE_SWITCHER_UNSAVED_DESC", () => {
  for (const l of LOCALES) {
    const json = JSON.parse(
      fs.readFileSync(path.join(__dirname, `../locale/${l}.json`), "utf8")
    );
    assert.equal(typeof json.FILE_SWITCHER_UNSAVED_DESC, "string", l);
    assert.ok(json.FILE_SWITCHER_UNSAVED_DESC.length > 0, l);
  }
});
