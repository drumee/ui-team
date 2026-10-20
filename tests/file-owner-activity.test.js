// file-owner-activity.test.js — "<A> edited / commented on <your file>", the
// notification addressed to a file's owner (server-team lib/file-owner-notify).
//   node --test tests/file-owner-activity.test.js
//
// The module-level helpers are sliced out of the real sources and run against
// a stub Wm, since the files themselves only load under webpack.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ITEM = fs.readFileSync(path.join(__dirname, "../src/drumee/builtins/panel/activity/widget/item/index.js"), "utf8");
const SKEL = fs.readFileSync(path.join(__dirname, "../src/drumee/builtins/panel/activity/widget/item/skeleton/index.js"), "utf8");
const PANEL = fs.readFileSync(path.join(__dirname, "../src/drumee/builtins/panel/activity/index.js"), "utf8");

// A top-level `function name(…) { … }`, up to its closing brace at column 0.
function sliceTop(src, name) {
  const start = src.indexOf(`\nfunction ${name}(`);
  if (start < 0) throw new Error(`${name} not found`);
  const end = src.indexOf("\n}\n", start);
  return src.slice(start, end + 3);
}

global._ = { isFunction: (f) => typeof f === "function" };
global._a = { chat: "chat" };
const openFileOwnerActivity = new Function(
  `${sliceTop(ITEM, "openThreadComment")}\n${sliceTop(ITEM, "openFileOwnerActivity")}; return openFileOwnerActivity;`,
)();
const isFileOwnerCategory = new Function(`${sliceTop(ITEM, "isFileOwnerCategory")}; return isFileOwnerCategory;`)();
const fileLabel = new Function(`${sliceTop(SKEL, "fileLabel")}; return fileLabel;`)();

const flush = () => new Promise((r) => setTimeout(r, 0));

function stubWm({ pane }) {
  const calls = [];
  global.window = {
    Wm: {
      openNotificationLocation: (args) => (calls.push(["reveal", args]), Promise.resolve(pane)),
      openFileLocation: (args) => calls.push(["open", args]),
    },
  };
  return calls;
}

test("an edit lands on the file in its folder, then opens it in its player", async () => {
  const calls = stubWm({ pane: {} });
  const opened = [];
  const fetchService = () => {};
  openFileOwnerActivity(
    { hub_id: "h1", nid: "n1", filetype: "document", pid: "p1", filename: "Report", ts: 5 },
    { fetchService, openMedia: (data, opt) => opened.push([data, opt.fetchService]) },
  );
  await flush();
  assert.deepEqual(calls[0], ["reveal", { hub_id: "h1", nid: "n1", filetype: "document", pid: "p1", highlight: "1", ts: "5" }]);
  assert.deepEqual(opened, [[{ hub_id: "h1", nid: "n1", filetype: "document", filename: "Report" }, fetchService]]);
  assert.equal(calls.filter((c) => c[0] === "open").length, 0, "never Wm.openFileLocation");
});

function threadPane({ wide }) {
  const scoped = [];
  const asked = [];
  const scrolled = [];
  const pane = {
    activeTab: wide ? "chat" : "files",
    _isCompactChat: () => false,
    scopeChatToFile: (nid, label) => (scoped.push([nid, label]), Promise.resolve()),
    ensurePart: (name) => (asked.push(name), Promise.resolve({ isDestroyed: () => false, scrollToMessage: (id) => scrolled.push(id) })),
  };
  return { pane, scoped, asked, scrolled };
}

test("a chat-thread comment: Files tab scopes the folder chat and scrolls to the comment", async () => {
  const t = threadPane({ wide: false });
  const calls = stubWm({ pane: t.pane });
  openFileOwnerActivity({ hub_id: "h1", nid: "n1", filetype: "document", pid: "p1", filename: "Report", message_id: "m9", ts: 5 }, { openMedia: () => assert.fail("not the player") });
  for (let i = 0; i < 4; i++) await flush();
  assert.deepEqual(t.scoped, [["n1", "Report"]]);
  assert.deepEqual(t.asked, ["folder-chat"]);
  assert.deepEqual(t.scrolled, ["m9"]);
  assert.equal(calls.length, 1);
});

test("a chat-thread comment: wide Chat tab uses the thread side panel", async () => {
  const t = threadPane({ wide: true });
  stubWm({ pane: t.pane });
  openFileOwnerActivity({ hub_id: "h1", nid: "n1", filetype: "document", message_id: "m9", ts: 1 }, {});
  for (let i = 0; i < 4; i++) await flush();
  assert.deepEqual(t.asked, ["file-thread-chat"]);
  assert.deepEqual(t.scrolled, ["m9"]);
});

test("a destroyed chat is never scrolled", async () => {
  const t = threadPane({ wide: false });
  t.pane.ensurePart = () => Promise.resolve({ isDestroyed: () => true, scrollToMessage: () => assert.fail("destroyed") });
  stubWm({ pane: t.pane });
  openFileOwnerActivity({ hub_id: "h1", nid: "n1", filetype: "document", message_id: "m9", ts: 1 }, {});
  for (let i = 0; i < 4; i++) await flush();
});

test("a workspace the reader can no longer enter does nothing more", async () => {
  const calls = stubWm({ pane: null });
  openFileOwnerActivity({ hub_id: "h1", nid: "n1", filetype: "document", ts: 1 }, { openMedia: () => assert.fail("no player") });
  await flush();
  assert.deepEqual(calls.map((c) => c[0]), ["reveal"]);
});

test("without Wm the reveal link still lands on the file", () => {
  global.window = {};
  global.location = { hash: "" };
  openFileOwnerActivity({ hub_id: "h1", nid: "n1", filetype: "document", pid: "p1", ts: 7 });
  assert.equal(location.hash, "#/desk/wm/reveal/?hub_id=h1&nid=n1&filetype=document&pid=p1&highlight=1&ts=7");
});

test("categories, label, copy and wiring", () => {
  assert.equal(isFileOwnerCategory("file_edited"), true);
  assert.equal(isFileOwnerCategory("file_commented"), true);
  assert.equal(isFileOwnerCategory("media"), false);
  assert.equal(fileLabel("Report", "docx"), "Report.docx");
  assert.equal(fileLabel("Report.docx", "DOCX"), "Report.docx");
  assert.equal(fileLabel("Notes", ""), "Notes");
  // Read and removed by id like every contact_activity row.
  assert.match(ITEM, /isFileOwnerCategory\(opt\.category\) \? 'contact_invite'/);
  assert.match(SKEL, /case 'file_edited':\n\s*case 'file_commented': \{/);
  assert.match(PANEL, /case "activity\.file_owner":/);
  for (const l of ["en", "es", "fr", "km", "ru", "zh"]) {
    const json = JSON.parse(fs.readFileSync(path.join(__dirname, `../locale/${l}.json`), "utf8"));
    assert.ok(json.FILE_EDITED_ACTION, `FILE_EDITED_ACTION missing in ${l}`);
    assert.ok(json.TASK_COMMENTED_ACTION, `TASK_COMMENTED_ACTION missing in ${l}`);
  }
});
