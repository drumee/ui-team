// folder-chat-details-host.test.js — the folder window as host of
// widget_chat_details: what it feeds into its "chat-details" slot, and that
// every widget action maps to the behaviour the window had before the move.
//
//   node --test tests/folder-chat-details-host.test.js
const test = require("node:test");
const assert = require("node:assert/strict");

const node = (type) => (opt = {}) => ({ type, ...opt });
global.Skeletons = { Box: { X: node("Box.X"), Y: node("Box.Y") }, Note: node("Note"), Image: { Svg: node("Image.Svg") }, Button: { Svg: node("Button.Svg") } };
const en = require("../locale/en.json");
global.LOCALE = new Proxy(en, { get: (t, k) => (k in t ? t[k] : k) });
global._a = new Proxy({}, { get: (t, k) => k });
global._K = { permission: { download: 4 } };

const H = require("../src/drumee/builtins/window/folder/chat-details-host");

function fakeWindow({ canChat = true, attrs = {} } = {}) {
  const panel = { el: { dataset: {} }, fed: [], feed(k) { this.fed.push(k); } };
  const view = { el: { dataset: {} } };
  const calls = [];
  const w = {
    panel, view, calls,
    __folderView: view,
    mget: (k) => ({ hub_id: "h1", actual_hub_id: "hA", nid: "n1", privilege: canChat ? 7 : 1, area: "private", headless: 1, ...attrs })[k],
    _privilegeGrantsChat: () => canChat,
    _closeThreadMenu() { calls.push(["closeThreadMenu"]); },
    ensurePart(pn) { calls.push(["ensurePart", pn]); return Promise.resolve(panel); },
    _openChatExportModal() { calls.push(["export"]); return Promise.resolve("x"); },
    scopeChatToFile(nid, label) { calls.push(["scope", nid, label]); },
    openFileLocation(src) { calls.push(["openFile", src]); return Promise.resolve(); },
    _fetchThreadList() { return Promise.resolve([{ file_nid: "f1" }]); },
    _launchMeetingInPanel() { calls.push(["launch"]); return true; },
  };
  return w;
}

test("open: feeds widget_chat_details in workspace mode with the window as host, stamps the split body", async () => {
  const w = fakeWindow();
  await H.openDetails(w);
  const d = w.panel.fed.at(-1);
  assert.equal(d.kind, "widget_chat_details");
  assert.equal(d.mode, "workspace");
  assert.equal(d.host, w);
  assert.equal(d.hub_id, "hA");
  assert.equal(d.nid, "n1");
  assert.equal(d.privilege, 7);
  assert.equal(w.view.el.dataset.details, "open");
  assert.ok(w.calls.some((c) => c[0] === "closeThreadMenu"));
});

test("open: a chat-gated viewer gets no widget", async () => {
  const w = fakeWindow({ canChat: false });
  await H.openDetails(w);
  assert.equal(w.panel.fed.length, 0);
  assert.notEqual(w.view.el.dataset.details, "open");
});

test("close: unstamps and empties the slot", async () => {
  const w = fakeWindow();
  await H.openDetails(w);
  H.closeDetails(w);
  assert.equal(w.view.el.dataset.details, "closed");
  assert.deepEqual(w.panel.fed.at(-1), []);
});

test("every widget action maps to the window's old behaviour", async () => {
  const w = fakeWindow();
  await H.openDetails(w);
  const desk = { lit: [], _railHighlight(t) { this.lit.push(t); } };
  assert.equal(await H.hostAction(w, "download", {}), "x");
  H.hostAction(w, "thread", { file_nid: "f9", filename: "Spec" });
  await H.hostAction(w, "open-media", { nid: "m1", hub_id: "hX", filetype: "image", filename: "a.png" });
  H.hostAction(w, "meeting", {}, desk);
  H.hostAction(w, "close", {});
  assert.deepEqual(w.calls.filter((c) => c[0] !== "ensurePart" && c[0] !== "closeThreadMenu"), [
    ["export"],
    ["scope", "f9", "Spec"],
    ["openFile", { nid: "m1", hub_id: "hX", pid: "n1", area: "private", filetype: "image" }],
    ["launch"],
  ]);
  assert.deepEqual(desk.lit, ["meeting"]);
  assert.equal(w.view.el.dataset.details, "closed");
});

test("thread closes the details before scoping the chat", async () => {
  const w = fakeWindow();
  await H.openDetails(w);
  H.hostAction(w, "thread", { file_nid: "f9", filename: "Spec" });
  assert.equal(w.view.el.dataset.details, "closed");
});

test("threads and meeting state come from the window", async () => {
  const w = fakeWindow();
  assert.deepEqual(await H.threads(w), [{ file_nid: "f1" }]);
  assert.deepEqual(H.meetingState(w), { label: en.MEETING, joined: false, hidden: false });
});

// On the Chat tab the chat stays in view beside the details, so its ⋮ stays
// clickable: a second click closes the panel instead of re-feeding it.
test("toggle: the ⋮ opens details, a second click closes them", async () => {
  const w = fakeWindow();
  await H.toggleDetails(w);
  assert.equal(w.view.el.dataset.details, "open");
  const fed = w.panel.fed.length;
  await H.toggleDetails(w);
  assert.equal(w.view.el.dataset.details, "closed");
  assert.deepEqual(w.panel.fed.at(-1), []);
  assert.equal(w.panel.fed.length, fed + 1);
  await H.toggleDetails(w);
  assert.equal(w.view.el.dataset.details, "open");
});

// Chat tab with details open (rail | chat | details): a File Threads row
// opens the file-thread panel in that third column — details give way, or
// the panel opens hidden behind them.
test("opening a file thread closes Chat details; nothing happens when they are closed", async () => {
  const w = fakeWindow();
  await H.openDetails(w);
  assert.equal(w.view.el.dataset.details, "open");
  H.onFileThreadOpen(w);
  assert.equal(w.view.el.dataset.details, "closed");
  assert.deepEqual(w.panel.fed.at(-1), []);
  const n = w.panel.fed.length;
  H.onFileThreadOpen(w);
  assert.equal(w.panel.fed.length, n, "closed details are left alone");
});
