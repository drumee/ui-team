// tests/folder-siblings.test.js — the switcher's same-level folder list.
//
//   node --test tests/folder-siblings.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  siblingScope,
  siblingFolders,
  fetchSiblingFolders,
  PAGE_SIZE,
  MAX_PAGES,
} = require("../src/drumee/libs/folder-siblings");

const root = { nid: "R1", hub_id: "H1", filetype: "hub", filename: "/", hub_name: "aaaa", area: "private" };
const abc = { nid: "F1", pid: "R1", hub_id: "H1", filetype: "folder", filename: "abc", area: "private" };

test("one crumb has no sibling scope", () => {
  assert.equal(siblingScope([root]), null);
  assert.equal(siblingScope([]), null);
  assert.equal(siblingScope(undefined), null);
});

test("two crumbs: parent is the workspace root, named by hub_name", () => {
  assert.deepEqual(siblingScope([root, abc]), {
    hub_id: "H1",
    parentNid: "R1",
    currentNid: "F1",
    parentName: "aaaa",
    area: "private",
    key: "H1:R1",
  });
});

test("a hub row with actual_home_id lists from its real root", () => {
  const s = siblingScope([{ ...root, actual_home_id: "R9" }, abc]);
  assert.equal(s.parentNid, "R9");
});

test("deeper path: parent is the second-to-last crumb", () => {
  const x = { nid: "F2", pid: "F1", hub_id: "H1", filetype: "folder", filename: "x" };
  const s = siblingScope([root, abc, x]);
  assert.equal(s.parentNid, "F1");
  assert.equal(s.parentName, "abc");
  assert.equal(s.currentNid, "F2");
});

test("missing ids yield no scope", () => {
  assert.equal(siblingScope([root, { ...abc, nid: null }]), null);
  assert.equal(siblingScope([{ ...root, hub_id: null }, { ...abc, hub_id: null }]), null);
});

test("siblingFolders keeps active folders, drops hubs, files and deleted rows", () => {
  const rows = [
    { nid: "a", filetype: "folder", status: "active" },
    { nid: "b", filetype: "hub" },
    { nid: "c", filetype: "document" },
    { nid: "d", filetype: "folder", status: "deleted" },
    { nid: "e", filetype: "folder" },
  ];
  assert.deepEqual(siblingFolders(rows).map((r) => r.nid), ["a", "e"]);
});

test("siblingFolders accepts a single-row object and wrapped lists", () => {
  assert.deepEqual(siblingFolders({ nid: "a", filetype: "folder" }).map((r) => r.nid), ["a"]);
  assert.deepEqual(siblingFolders({ data: [{ nid: "a", filetype: "folder" }] }).map((r) => r.nid), ["a"]);
  assert.deepEqual(siblingFolders(null), []);
});

test("fetch asks show_node_by for type node, the parent nid, a cache-buster", async () => {
  const calls = [];
  const scope = siblingScope([root, abc]);
  await fetchSiblingFolders(async (p) => (calls.push(p), []), scope, { now: () => 42 });
  assert.deepEqual(calls, [{ hub_id: "H1", nid: "R1", type: "node", page: 1, _ts: 42 }]);
});

test("reads every page until a short one", async () => {
  const full = (page) =>
    Array.from({ length: PAGE_SIZE }, (_, i) => ({ nid: `${page}-${i}`, filetype: "folder" }));
  const pages = { 1: full(1), 2: full(2), 3: [{ nid: "last", filetype: "folder" }] };
  const seen = [];
  const rows = await fetchSiblingFolders(
    async (p) => (seen.push(p.page), pages[p.page] || []),
    siblingScope([root, abc]),
  );
  assert.deepEqual(seen, [1, 2, 3]);
  assert.equal(rows.length, PAGE_SIZE * 2 + 1);
  assert.equal(rows[rows.length - 1].nid, "last");
});

test("stops at MAX_PAGES even if the server never sends a short page", async () => {
  let n = 0;
  await fetchSiblingFolders(async () => {
    n++;
    return Array.from({ length: PAGE_SIZE }, (_, i) => ({ nid: `${n}-${i}`, filetype: "folder" }));
  }, siblingScope([root, abc]));
  assert.equal(n, MAX_PAGES);
});

test("a rejected fetch rejects (the caller decides what to show)", async () => {
  await assert.rejects(
    fetchSiblingFolders(async () => { throw new Error("403"); }, siblingScope([root, abc])),
    /403/,
  );
});
