// The topbar workspace switcher lost every workspace past the first 45.
//
// `desk.home` is paginated — mfs_show_node_by's pageToLimits UDF is a hard
// offset=(page-1)*45, range=45 — and _fetchWorkspaces never sent `page`, so it
// only ever saw page 1. A home listing is ordered `rank asc` and a workspace
// just created or just joined ranks LAST, so on a desk holding 45+ items the
// newest workspace sat alone on page 2 and never reached the menu: not on the
// forced cache-busted refetch, not after a reload. That menu is the only global
// way to change workspace, so it was unreachable.
//
// These run the real _fetchWorkspacePages body against a stub `this`.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const SRC = join(__dirname, "..", "src/drumee/modules/desk/index.js");
const SERVICE = { desk: { home: "desk.home" } };
const MAX_PAGES = 20;
const PAGE_SIZE = 45;

// Lift the method body out of the class so it runs without booting the desk.
function loadPager() {
  const src = readFileSync(SRC, "utf8");
  const m = src.match(/\n {2}async _fetchWorkspacePages\(force\) \{\n([\s\S]*?)\n {2}\}\n/);
  assert.ok(m, "_fetchWorkspacePages not found");
  return new Function(
    "_",
    "SERVICE",
    "Visitor",
    "WS_MAX_PAGES",
    "WS_PAGE_SIZE",
    `return async function (force) {\n${m[1]}\n};`,
  )({ isArray: Array.isArray }, SERVICE, { id: "u1" }, MAX_PAGES, PAGE_SIZE);
}

// `pages` is what the server answers per page number (1-indexed).
function desk(pages) {
  return {
    calls: [],
    fetchService(service, payload) {
      this.calls.push({ service, payload });
      return Promise.resolve(pages[payload.page]);
    },
  };
}

const rows = (n, tag) =>
  Array.from({ length: n }, (_v, i) => ({ filename: `${tag}${i}` }));

test("a desk under the page cap costs exactly one request", async () => {
  const d = desk({ 1: rows(10, "a") });
  const out = await loadPager().call(d);

  assert.equal(d.calls.length, 1);
  assert.equal(d.calls[0].service, "desk.home");
  assert.equal(d.calls[0].payload.page, 1);
  assert.equal(out.length, 10);
});

test("a full first page is followed, and the 46th workspace comes back", async () => {
  const d = desk({ 1: rows(45, "a"), 2: [{ filename: "rmcheck0908" }] });
  const out = await loadPager().call(d);

  assert.deepEqual(d.calls.map((c) => c.payload.page), [1, 2]);
  assert.equal(out.length, 46);
  assert.ok(out.some((r) => r.filename === "rmcheck0908"));
});

test("a desk sitting exactly on the cap reads page 2 and stops on empty", async () => {
  const d = desk({ 1: rows(45, "a"), 2: [] });
  const out = await loadPager().call(d);

  assert.deepEqual(d.calls.map((c) => c.payload.page), [1, 2]);
  assert.equal(out.length, 45);
});

test("a desk one row under the cap does NOT pay for a second request", async () => {
  const d = desk({ 1: rows(44, "a") });
  const out = await loadPager().call(d);

  assert.equal(d.calls.length, 1);
  assert.equal(out.length, 44);
});

test("a one-row answer arrives as a bare object and is normalised", async () => {
  const d = desk({ 1: { filename: "only" } });
  const out = await loadPager().call(d);

  assert.deepEqual(out, [{ filename: "only" }]);
});

test("an empty home is an empty list, not a crash", async () => {
  const d = desk({ 1: null });
  assert.deepEqual(await loadPager().call(d), []);
  assert.equal(d.calls.length, 1);
});

test("force cache-busts every page; the unforced read does not", async () => {
  const forced = desk({ 1: rows(45, "a"), 2: rows(1, "b") });
  await loadPager().call(forced, 1);
  assert.ok(forced.calls.every((c) => c.payload._ts));

  const plain = desk({ 1: rows(2, "a") });
  await loadPager().call(plain);
  assert.ok(plain.calls.every((c) => c.payload._ts === undefined));
});

test("a server that never runs out is stopped by the page cap", async () => {
  const pages = {};
  for (let i = 1; i <= MAX_PAGES + 5; i++) pages[i] = rows(45, `p${i}-`);
  const d = desk(pages);
  const out = await loadPager().call(d);

  assert.equal(d.calls.length, MAX_PAGES);
  assert.equal(out.length, MAX_PAGES * 45);
});
