// tests/desk-switcher-folder-mode.test.js — the switcher lists same-level
// folders when the address is deeper than the workspace.
//
//   node --test tests/desk-switcher-folder-mode.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const SRC = fs.readFileSync(
  path.join(__dirname, "../src/drumee/modules/desk/index.js"),
  "utf8",
);

const _ = {
  isFunction: (f) => typeof f === "function",
  uniqueId: (p) => `${p}1`,
  sortBy: (a) => a,
};
const _a = { folder: "folder", hub: "hub", state: "state", personal: "personal" };
const Skeletons = {
  Note: (o) => ({ kind: "note", ...o }),
  Element: (o) => ({ kind: "element", ...o }),
  Box: { X: (o) => ({ kind: "box", ...o }) },
};
const LOCALE = { NO_CONTENT: "Empty", FOLDERS: "Folders" };
const SERVICE = { media: { show_node_by: "media.show_node_by" } };
const folderIcon = () => "<svg/>";

function load(sig, extra = {}) {
  const deps = { _, _a, Skeletons, LOCALE, SERVICE, folderIcon, window: {}, ...extra };
  return new Function(...Object.keys(deps), `return ${sliceFunction(SRC, sig)}`)(
    ...Object.values(deps),
  );
}

const scope = {
  hub_id: "H1", parentNid: "R1", currentNid: "F1",
  parentName: "aaaa", area: "private", key: "H1:R1",
};
const rows = [
  { nid: "F1", filename: "abc", filetype: "folder" },
  { nid: "F2", filename: "asdasd", filetype: "folder" },
  { nid: "F3", filename: "test", filetype: "folder" },
];
const part = () => {
  const p = { el: {}, fed: [], feed(k) { p.fed.push(k); }, isDestroyed: () => false };
  return p;
};

test("_feedFolderSiblings: heading is the parent's name, current row marked", () => {
  const feed = load("_feedFolderSiblings(list, scope, rows)");
  const list = part();
  feed.call({}, list, scope, rows);
  const kids = list.fed[0];
  assert.equal(kids[0].content, "aaaa");
  assert.deepEqual(kids.slice(1).map((k) => k.service), ["switch-folder", "switch-folder", "switch-folder"]);
  assert.deepEqual(kids.slice(1).map((k) => k.attrOpt["data-current"]), ["1", "0", "0"]);
  assert.equal(kids[2].folderNid, "F2");
  assert.equal(kids[2].folderHubId, "H1");
});

test("_feedFolderSiblings: identical feed into the same part is skipped", () => {
  const feed = load("_feedFolderSiblings(list, scope, rows)");
  const self = {};
  const list = part();
  feed.call(self, list, scope, rows);
  feed.call(self, list, scope, rows);
  assert.equal(list.fed.length, 1);
});

test("_feedFolderSiblings: no rows → the empty note", () => {
  const feed = load("_feedFolderSiblings(list, scope, rows)");
  const list = part();
  feed.call({}, list, scope, []);
  assert.equal(list.fed[0][0].content, "Empty");
});

test("_renderFolderSiblings: fetches the parent and feeds the folders", async () => {
  const calls = [];
  const render = load("async _renderFolderSiblings(scope)", {
    fetchSiblingFolders: async (fetch, s) => (calls.push(s.key), rows),
  });
  const list = part();
  const fed = [];
  const self = {
    _wsListPart: list,
    _wsMenuMode: "folders",
    fetchService: () => Promise.resolve([]),
    _feedFolderSiblings: (l, s, r) => fed.push(r.map((x) => x.nid)),
  };
  await render.call(self, scope);
  assert.deepEqual(calls, ["H1:R1"]);
  assert.deepEqual(fed.at(-1), ["F1", "F2", "F3"]);
});

test("_renderFolderSiblings: a late answer for another scope is dropped", async () => {
  let release;
  const render = load("async _renderFolderSiblings(scope)", {
    fetchSiblingFolders: () => new Promise((r) => (release = r)),
  });
  const fed = [];
  const self = {
    _wsListPart: part(),
    _wsMenuMode: "folders",
    fetchService: () => Promise.resolve([]),
    _feedFolderSiblings: (l, s, r) => fed.push(r.length),
  };
  const p = render.call(self, scope);
  self._folderScopeKey = "H1:OTHER"; // the user moved and reopened
  release(rows);
  await p;
  assert.deepEqual(fed, [0]); // only the initial empty paint
});

test("_renderFolderSiblings: a failed fetch with no cache feeds the empty note", async () => {
  const render = load("async _renderFolderSiblings(scope)", {
    fetchSiblingFolders: async () => { throw new Error("403"); },
  });
  const fed = [];
  const self = {
    _wsListPart: part(),
    _wsMenuMode: "folders",
    warn() {},
    fetchService: () => Promise.resolve([]),
    _feedFolderSiblings: (l, s, r) => fed.push(r.length),
  };
  await render.call(self, scope);
  assert.deepEqual(fed, [0, 0]);
});

test("_renderFolderSiblings: a cached level paints at once, before the fetch", async () => {
  const render = load("async _renderFolderSiblings(scope)", {
    fetchSiblingFolders: async () => rows,
  });
  const fed = [];
  const self = {
    _wsListPart: part(),
    _wsMenuMode: "folders",
    _folderSiblings: { "H1:R1": rows.slice(0, 1) },
    fetchService: () => Promise.resolve([]),
    _feedFolderSiblings: (l, s, r) => fed.push(r.length),
  };
  await render.call(self, scope);
  assert.deepEqual(fed, [1, 3]);
});

test("_prepareSwitcherMode: deeper path → folders mode, chip stamped", () => {
  const prep = load("_prepareSwitcherMode()");
  const chip = { el: { dataset: {} } };
  let rendered = null;
  const self = {
    _crumbGroupPart: chip,
    getPart: () => ({ siblingScope: () => scope }),
    _renderFolderSiblings: (s) => ((rendered = s.key), Promise.resolve()),
  };
  prep.call(self);
  assert.equal(self._wsMenuMode, "folders");
  assert.equal(chip.el.dataset.wsMode, "folders");
  assert.equal(rendered, "H1:R1");
});

test("_prepareSwitcherMode: one crumb → workspaces mode and the list is repainted", () => {
  const prep = load("_prepareSwitcherMode()");
  const chip = { el: { dataset: { wsMode: "folders" } } };
  let repainted = 0;
  const self = {
    _wsMenuMode: "folders",
    _wsListPart: part(),
    _crumbGroupPart: chip,
    getPart: () => ({ siblingScope: () => null }),
    _renderWorkspaceMenu: () => (repainted++, Promise.resolve()),
  };
  prep.call(self);
  assert.equal(self._wsMenuMode, "workspaces");
  assert.equal(chip.el.dataset.wsMode, "workspaces");
  assert.equal(repainted, 1);
});

test("_renderWorkspaceMenu leaves the list alone in folder mode", () => {
  // Source-level: both list feeds in _renderWorkspaceMenu are gated.
  const body = sliceFunction(SRC, "async _renderWorkspaceMenu(target, force)");
  const gates = body.match(/this\._wsMenuMode !== "folders"/g) || [];
  assert.equal(gates.length, 2);
});

test("_toggleWorkspaceSwitcher prepares the mode only when opening", () => {
  const toggle = load("_toggleWorkspaceSwitcher()");
  let prepared = 0;
  let toggled = 0;
  const menu = { el: {}, isOpen: false, mget: () => 0, _triggerToggle: () => toggled++ };
  const self = { _wsSwitcher: menu, _prepareSwitcherMode: () => prepared++ };
  toggle.call(self);
  menu.isOpen = true;
  toggle.call(self);
  assert.equal(prepared, 1);
  assert.equal(toggled, 2);
});

test("_switchFolder opens the picked folder through Wm, skips the current one", () => {
  const opened = [];
  const win = { Wm: { openWorkspaceFolder: (n) => opened.push(n) } };
  const sw = load("_switchFolder(cmd)", { window: win });
  const cmd = (nid) => ({ mget: (k) => ({ folderNid: nid, folderHubId: "H1", folderArea: "private" })[k] });
  const self = { getPart: () => ({ siblingScope: () => scope }) };
  sw.call(self, cmd("F2"));
  sw.call(self, cmd("F1"));
  assert.deepEqual(opened, [{ hub_id: "H1", nid: "F2", area: "private", filetype: "folder" }]);
});

test("onUiEvent routes switch-folder: close the panel, then switch", () => {
  assert.match(
    SRC,
    /case "switch-folder":\s*\n\s*this\._closeWorkspaceSwitcher\(\);\s*\n\s*return this\._switchFolder\(cmd\);/,
  );
});
