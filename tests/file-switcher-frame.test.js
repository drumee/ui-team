// tests/file-switcher-frame.test.js — the frame that puts the Open-File
// Switcher on the left of a player.
//
//   node --test tests/file-switcher-frame.test.js
//
// frame.js only touches globals (Visitor, _a, Skeletons, localStorage), so it
// loads under plain node once they are stubbed.
const test = require("node:test");
const assert = require("node:assert/strict");

function fakeStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
  };
}

global.Visitor = { isMobile: () => false, inDmz: false };
global._a = { pid: "pid", hub_id: "hub_id", nid: "nid" };
global.Skeletons = {
  Box: { X: (o) => ({ t: "X", ...o }), Y: (o) => ({ t: "Y", ...o }) },
};
global.localStorage = fakeStorage();

const withFileSwitcher = require("../src/drumee/builtins/player/widget/file-switcher/frame");

const ui = (m) => ({ mget: (k) => m[k] });
const FILE = { nid: 1, pid: 2, hub_id: "h" };

function reset() {
  global.Visitor = { isMobile: () => false, inDmz: false };
  global.localStorage = fakeStorage();
}

test("wraps a player root and keeps its parts", () => {
  reset();
  const kids = [{ sys_pn: "topbar" }, { sys_pn: "content" }];
  const root = withFileSwitcher(ui(FILE), { className: "player__main", kids: [...kids] });
  assert.equal(root.kids.length, 1);
  assert.equal(root.kids[0].className, "file-switcher__frame");
  assert.equal(root.kids[0].kids[0].kind, "player_file_switcher");
  assert.deepEqual(root.kids[0].kids[1].kids, kids);
  assert.ok(root.className.includes("file-switcher__host"));
});

test("dialog and tooltips wrappers stay at root", () => {
  reset();
  const header = { className: "header" };
  const body = { className: "body" };
  const root = withFileSwitcher(ui(FILE), {
    className: "x",
    kids: [header, { name: "tooltips" }, body, { name: "dialog" }],
  });
  assert.deepEqual(
    root.kids.map((k) => k.name || k.className),
    ["file-switcher__frame", "tooltips", "dialog"]
  );
  assert.deepEqual(root.kids[0].kids[1].kids, [header, body]);
});

test("no panel without nid (maiden note)", () => {
  reset();
  const kids = [{ sys_pn: "content" }];
  const root = { className: "x", kids };
  const u = ui({ pid: 2, hub_id: "h" });
  assert.equal(withFileSwitcher(u, root), root);
  assert.equal(root.kids, kids);
  assert.equal(withFileSwitcher.enabled(u), false);
});

test("no panel on mobile / in DMZ / without pid", () => {
  reset();
  global.Visitor = { isMobile: () => true, inDmz: false };
  let root = { className: "x", kids: [] };
  assert.equal(withFileSwitcher(ui(FILE), root).kids.length, 0);

  global.Visitor = { isMobile: () => false, inDmz: true };
  root = { className: "x", kids: [] };
  assert.equal(withFileSwitcher(ui(FILE), root).kids.length, 0);

  reset();
  root = { className: "x", kids: [] };
  assert.equal(withFileSwitcher(ui({ nid: 1, hub_id: "h" }), root).kids.length, 0);
});

test("reservedWidth", () => {
  reset();
  assert.equal(withFileSwitcher.reservedWidth(ui(FILE)), 248);
  withFileSwitcher.writeCollapsed(true);
  assert.equal(withFileSwitcher.reservedWidth(ui(FILE)), 68);
  assert.equal(withFileSwitcher.reservedWidth(ui({ pid: 2, hub_id: "h" })), 0);
});

test("readCollapsed survives throwing storage", () => {
  reset();
  global.localStorage = {
    getItem() { throw new Error("denied"); },
    setItem() { throw new Error("denied"); },
  };
  assert.equal(withFileSwitcher.readCollapsed(), false);
  assert.doesNotThrow(() => withFileSwitcher.writeCollapsed(true));
});

test("every file player skeleton wraps its root", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  for (const p of ["audio", "video", "vector", "text", "image", "document"]) {
    const src = fs.readFileSync(
      path.join(__dirname, `../src/drumee/builtins/player/${p}/skeleton/index.js`),
      "utf8"
    );
    assert.match(src, /withFileSwitcher\(/, p);
  }
});
