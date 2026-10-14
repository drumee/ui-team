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
const LOCALE = { NO_CONTENT: "Empty", FOLDERS: "Folders", FOLDERS_IN: "In {0}" };
// LOCALE strings are formatted with the app's String#format.
if (!String.prototype.format) {
  String.prototype.format = function (...a) {
    return this.replace(/\{(\d+)\}/g, (_m, i) => a[i]);
  };
}
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

test("_feedFolderSiblings: an \"In <parent>\" group label, then the rows, current marked", () => {
  const feed = load("_feedFolderSiblings(list, scope, rows)");
  const list = part();
  feed.call({}, list, { ...scope, parentFiletype: "hub", parentArea: "private" }, rows);
  const kids = list.fed[0];
  assert.equal(kids[0].className, "desk-module-topbar__ws-section");
  assert.equal(kids[0].content, "In aaaa");
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
    _feedFolderHead() {},
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
    _feedFolderHead() {},
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
    _feedFolderHead() {},
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
    _feedFolderHead() {},
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

test("_renderWorkspaceMenu leaves the list alone in folder mode", async () => {
  // Both feeds: the empty note and the grouped rows. The mode is checked
  // AFTER the fetch, so a revalidation that lands once the panel switched to
  // folders is dropped too.
  const render = load("async _renderWorkspaceMenu(target, force)");
  for (const ws of [[], [{ hub_id: "W1", filename: "aaaa", filetype: "hub" }]]) {
    const list = part();
    let resolve;
    const self = {
      _wsMenuMode: "workspaces",
      _fetchWorkspaces: () => new Promise((r) => (resolve = r)),
      _workspaceKey: () => "k",
      _groupWorkspaces: (rows) => [{ label: "W", rows }],
    };
    const p = render.call(self, list);
    self._wsMenuMode = "folders";
    resolve(ws);
    await p;
    assert.equal(list.fed.length, 0, `fed ${ws.length} rows over folder mode`);
  }
});

test("_toggleWorkspaceSwitcher prepares, places and reveals only when opening", () => {
  const toggle = load("_toggleWorkspaceSwitcher()");
  let prepared = 0;
  let placed = 0;
  let revealed = 0;
  let toggled = 0;
  const menu = { el: {}, isOpen: false, mget: () => 0, _triggerToggle: () => toggled++ };
  const self = {
    _wsSwitcher: menu,
    _prepareSwitcherMode: () => prepared++,
    _placeSwitcherPanel: () => placed++,
    _afterPaint: (fn) => fn(),
    _revealSwitcherCurrent: () => revealed++,
  };
  toggle.call(self);
  menu.isOpen = true;
  toggle.call(self);
  assert.equal(prepared, 1);
  assert.equal(placed, 1);
  assert.equal(revealed, 1);
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

test("_renderFolderSiblings: a late answer for another current folder is dropped", async () => {
  let release;
  const render = load("async _renderFolderSiblings(scope)", {
    fetchSiblingFolders: () => new Promise((r) => (release = r)),
  });
  const fed = [];
  const self = {
    _wsListPart: part(),
    _wsMenuMode: "folders",
    _feedFolderHead() {},
    fetchService: () => Promise.resolve([]),
    _feedFolderSiblings: (l, s, r) => fed.push(r.length),
  };
  const p = render.call(self, scope);
  // Same parent, but the user moved to a sibling and reopened.
  self._folderScopeCur = "F3";
  release(rows);
  await p;
  assert.deepEqual(fed, [0]);
});

test("_renderWorkspaceMenu: the empty-workspaces note also resets the folder feed signature", async () => {
  const render = load("async _renderWorkspaceMenu(target, force)");
  const list = part();
  const self = {
    _wsMenuMode: "workspaces",
    _folderFeedSig: "S",
    _fetchWorkspaces: async () => [],
  };
  await render.call(self, list);
  assert.equal(list.fed.length, 1);
  assert.equal(self._folderFeedSig, null);
});

test("_feedFolderSiblings: a parent with no name is labelled Folders", () => {
  const list = part();
  load("_feedFolderSiblings(list, scope, rows)").call({}, list, { ...scope, parentName: "" }, rows);
  assert.equal(list.fed[0][0].content, "Folders");
});

test("_feedFolderHead names the open folder in the header slot, glyph and name only", () => {
  const icons = [];
  const head = part();
  const fh = load("_feedFolderHead(scope)", { folderIcon: (o) => (icons.push(o), "<svg/>") });
  fh.call({ _wsHeadPart: head }, { ...scope, currentName: "abc" });
  const kids = head.fed[0];
  assert.equal(kids.length, 2);
  assert.equal(kids[0].className, "desk-module-topbar__ws-head-icon private");
  assert.deepEqual({ filetype: icons[0].filetype, area: icons[0].area }, { filetype: "folder", area: "private" });
  assert.equal(kids[1].kids[0].content, "abc");
});

test("_renderWorkspaceMenu leaves the header to folder mode", async () => {
  const render = load("async _renderWorkspaceMenu(target, force)");
  const head = part();
  const self = {
    _wsMenuMode: "folders",
    _wsHeadPart: head,
    _fetchWorkspaces: async () => [{ hub_id: "W1", filename: "aaaa", filetype: "hub" }],
    _workspaceKey: () => "k",
    _groupWorkspaces: (r) => [{ label: "W", rows: r }],
    _feedWorkspaceHead: () => head.feed(["workspace head"]),
  };
  await render.call(self, part());
  assert.equal(head.fed.length, 0);
  self._wsMenuMode = "workspaces";
  self._bindPinnedDrag = () => {};
  await render.call(self, part());
  assert.deepEqual(head.fed, [["workspace head"]]);
});

// ── A long list opens on the open row, under the crumb it is about ──────────
const rect = (top, height, left = 0, width = 0) => ({ top, bottom: top + height, height, left, right: left + width });

test("_revealSwitcherCurrent centres the open row when it is out of view", () => {
  const reveal = load("_revealSwitcherCurrent()");
  const row = { getBoundingClientRect: () => rect(700, 36) };
  const list = { scrollTop: 0, querySelector: () => row, getBoundingClientRect: () => rect(50, 300) };
  reveal.call({ _wsListPart: { el: list } });
  // 700 - 50 - (300 - 36) / 2 = 518
  assert.equal(list.scrollTop, 518);
});

test("_revealSwitcherCurrent leaves the list alone when the row is already visible, or not laid out", () => {
  const reveal = load("_revealSwitcherCurrent()");
  const visible = { scrollTop: 7, querySelector: () => ({ getBoundingClientRect: () => rect(80, 36) }), getBoundingClientRect: () => rect(50, 300) };
  reveal.call({ _wsListPart: { el: visible } });
  assert.equal(visible.scrollTop, 7);
  const closed = { scrollTop: 0, querySelector: () => ({ getBoundingClientRect: () => rect(0, 0) }), getBoundingClientRect: () => rect(0, 0) };
  reveal.call({ _wsListPart: { el: closed } });
  assert.equal(closed.scrollTop, 0);
  const none = { scrollTop: 0, querySelector: () => null, getBoundingClientRect: () => rect(50, 300) };
  reveal.call({ _wsListPart: { el: none } });
  assert.equal(none.scrollTop, 0);
});

test("_placeSwitcherPanel starts the panel under the current crumb, pulled back at the window's edge", () => {
  const vars = {};
  const panelRect = { v: rect(48, 300, 600, 280) };
  const chip = {
    style: { setProperty: (k, v) => (vars[k] = v) },
    getBoundingClientRect: () => rect(0, 30, 300, 400),
    querySelector: (sel) =>
      /data-current/.test(sel)
        ? { getBoundingClientRect: () => rect(0, 30, 520, 120) }
        : { getBoundingClientRect: () => panelRect.v },
  };
  const place = load("_placeSwitcherPanel()", { window: { innerWidth: 1512 } });
  const self = { _crumbGroupPart: { el: chip }, _afterPaint: (fn) => fn() };
  place.call(self);
  assert.equal(vars["--ws-panel-left"], "220px");
  // A panel that would end past innerWidth - 12 is moved left by the overflow.
  panelRect.v = rect(48, 300, 1300, 280); // right edge 1580, limit 1500
  place.call(self);
  assert.equal(vars["--ws-panel-left"], "140px");
});

// ── Inside a folder, the current crumb's NAME opens the panel too ───────────
test("_crumbClickOpensSwitcher: on a folder the current crumb opens, the crumbs above it navigate", () => {
  const opens = load("_crumbClickOpensSwitcher(target)");
  // Crumbs loaded (icon + name) and two of them: the address is a folder.
  const self = { _crumbGroupPart: { el: { querySelector: () => ({}) } } };
  const click = (current, hits = {}) => ({
    closest: (sel) => {
      if (sel === ".breadcrumb-item__main") {
        return { dataset: { current }, classList: { contains: () => false } };
      }
      return hits[sel] || null;
    },
  });
  assert.equal(opens.call(self, click("1")), true, "the open folder's name");
  assert.equal(opens.call(self, click("0")), false, "a crumb above it goes back there");
  assert.equal(opens.call(self, click("0", { ".desk-module-topbar__ws-btn": {} })), true, "the caret");
  assert.equal(
    opens.call(self, click("1", { ".desk-module-topbar__ws-menu": {} })),
    false,
    "a row inside the open panel",
  );
});
