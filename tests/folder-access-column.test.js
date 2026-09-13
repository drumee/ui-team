const assert = require("node:assert/strict");
const test = require("node:test");

global._a = { media: "media", hub_id: "hub_id" };
global.SERVICE = { hub: { get_members_by_type: "hub.get_members_by_type" } };

const {
  ACCESS_TAB,
  ACCESS_PANEL_PN,
  accessPanelSpec,
  showAccessColumn,
  showsFileGrid,
} = require("../src/drumee/builtins/window/folder/access-column");

function folderWindow(over = {}) {
  const attrs = { media: { id: "m1" }, hub_id: "hub-1" };
  const trace = [];
  return {
    trace,
    mget: (k) => attrs[k],
    parts: {},
    getPart(pn) { return this.parts[pn] || null; },
    fetchService(service, params) {
      trace.push(["fetch", service, params && params.hub_id]);
      return new Promise(() => {});
    },
    ...over,
  };
}
function splitBody(win) {
  const appended = [];
  return {
    appended,
    append: (d) => {
      appended.push(d);
      if (win) win.trace.push(["append", d.kind]);
    },
  };
}

// Each test gets its own workspace id, so a prefetch one of them leaves in
// flight cannot be picked up by the next.
let hub = 0;
const freshHub = () => `hub-p${++hub}`;

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

test("pressing Access starts the members read before the panel is mounted", () => {
  // The mount triggers a dynamic import() of the panel's chunk — a whole
  // round trip before the panel exists to ask for anything. Asking here means
  // the code and the data travel at the same time.
  const win = folderWindow();
  const hub_id = win.mget("hub_id");
  showAccessColumn(win, splitBody(win));
  assert.deepEqual(win.trace, [["fetch", "hub.get_members_by_type", hub_id], ["append", "permission_restricted"]]);
  require("../src/drumee/libs/members-prefetch").takeMembers(hub_id);
});

test("re-entry does not start a second read behind the panel's own", () => {
  const win = folderWindow();
  const panel = { _loadMembers: () => win.trace.push(["reload"]) };
  win._accessPanelMounted = 1;
  win.parts[ACCESS_PANEL_PN] = panel;
  showAccessColumn(win, splitBody(win));
  assert.deepEqual(win.trace, [["reload"]]);
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
