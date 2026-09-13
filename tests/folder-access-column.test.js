const assert = require("node:assert/strict");
const test = require("node:test");

global._a = { media: "media", hub_id: "hub_id" };

const {
  ACCESS_TAB,
  ACCESS_PANEL_PN,
  accessPanelSpec,
  showAccessColumn,
  showsFileGrid,
} = require("../src/drumee/builtins/window/folder/access-column");

function folderWindow(over = {}) {
  const attrs = { media: { id: "m1" }, hub_id: "hub-1" };
  return {
    mget: (k) => attrs[k],
    parts: {},
    getPart(pn) { return this.parts[pn] || null; },
    ...over,
  };
}
function splitBody() {
  const appended = [];
  return { appended, append: (d) => appended.push(d) };
}

test("the tab id is the rail's literal", () => {
  assert.equal(ACCESS_TAB, "access");
});

test("the panel is permission_restricted in column mode, for this workspace", () => {
  const win = folderWindow();
  const spec = accessPanelSpec(win);
  assert.equal(spec.kind, "permission_restricted");
  assert.equal(spec.mode, "column");
  assert.equal(spec.hub_id, "hub-1");
  assert.deepEqual(spec.media, { id: "m1" });
  assert.equal(spec.sys_pn, ACCESS_PANEL_PN);
  assert.equal(spec.partHandler, win);
  assert.deepEqual(spec.uiHandler, [win]);
});

test("first entry mounts the panel once", () => {
  const win = folderWindow();
  const view = splitBody();
  assert.equal(showAccessColumn(win, view), null);
  assert.equal(view.appended.length, 1);
  assert.equal(view.appended[0].mode, "column");
});

test("re-entry does not mount again and refreshes the member list", () => {
  const win = folderWindow();
  const view = splitBody();
  showAccessColumn(win, view);
  let refreshed = 0;
  win.parts[ACCESS_PANEL_PN] = { _loadMembers: () => refreshed++, isDestroyed: () => false };
  const panel = showAccessColumn(win, view);
  assert.equal(view.appended.length, 1);
  assert.equal(refreshed, 1);
  assert.equal(panel, win.parts[ACCESS_PANEL_PN]);
});

test("an open drawer is cleared so the matrix is never on screen twice", () => {
  let cleared = 0;
  const win = folderWindow({ isShowSettings: true, dialogWrapper: { clear: () => cleared++ } });
  showAccessColumn(win, splitBody());
  assert.equal(cleared, 1);
  assert.equal(win.isShowSettings, false);
});

test("the views that keep the file grid's toolbar", () => {
  assert.equal(showsFileGrid(undefined), true);
  assert.equal(showsFileGrid("files"), true);
  assert.equal(showsFileGrid("access"), true);
  assert.equal(showsFileGrid("chat"), false);
  assert.equal(showsFileGrid("task"), false);
  assert.equal(showsFileGrid("meeting"), false);
});
