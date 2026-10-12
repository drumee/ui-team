// tests/folder-tab-repress-parks-call.test.js — re-pressing the rail for the
// pane already up still parks a live call.
//
//   node --test tests/folder-tab-repress-parks-call.test.js
//
// The desk raises the pane right after showFolderTab (_railTab / _railAccess).
// A full-frame call brought back from its tile sits in the window manager at
// the pane's own z, so a raise without a park only hides the call behind the
// pane; the first thing to take the pane's focus (a confirm card, a role
// dropdown) handed the canvas back to the call — the Access matrix "jumped to
// the meeting" on every role change or removal.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/builtins/window/folder/index.js"),
  "utf8",
);
// The module-level names the method reads, handed in from the real module
// (it loads under plain node — see its header).
const { ACCESS_TAB, hideAccessOverlay } = require("../src/drumee/builtins/window/folder/access-column");
const showFolderTab = new Function(
  "ACCESS_TAB",
  "hideAccessOverlay",
  `return ${sliceFunction(SRC, "showFolderTab(tab)")}`,
)(ACCESS_TAB, hideAccessOverlay);

function folder(activeTab) {
  const self = { activeTab, parked: 0, synced: 0 };
  self._parkLiveCall = () => { self.parked++; };
  self.syncNewCtrlVisibility = () => { self.synced++; };
  return self;
}

test("the same tab again parks the live call before the desk raises the pane", () => {
  const w = folder("task");
  showFolderTab.call(w, "task");
  assert.equal(w.parked, 1);
  assert.equal(w.synced, 1);
  assert.equal(w.activeTab, "task");
});

test("Access is not a tab: it goes to the overlay and leaves activeTab alone", () => {
  const w = folder("task");
  let opened = 0;
  w._openAccessOverlay = () => { opened++; };
  showFolderTab.call(w, "access");
  assert.equal(opened, 1);
  assert.equal(w.activeTab, "task");
});

test("the unchanged-tab path is still the short one: nothing else is touched", () => {
  const w = folder("files");
  // No _stashPanelScroll / _closeChatDetails / _announceTabSeen on the stub:
  // the tab-change path would throw on the first of them.
  assert.doesNotThrow(() => showFolderTab.call(w, "files"));
  assert.equal(w.parked, 1);
});
