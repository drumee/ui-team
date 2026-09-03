#!/usr/bin/env node

/**
 * The switcher lists workspaces under the type they were CREATED as.
 *
 * The vocabulary is not invented here — it is the create dialog's own
 * (modules/desk/tutorial/skeleton/toolkit/workspace-dialog.js TYPES):
 *
 *   internal -> area `private`
 *   external -> area `share`
 *   personal -> a home-root FOLDER, which _fetchWorkspaces maps to `personal`
 *
 * plus `dmz` folded into External (hub.js openSettings already treats
 * share+dmz as the external pair) and `public` on its own.
 *
 * The invariant that matters most: a workspace _fetchWorkspaces admits must
 * NEVER fall out of the list. The switcher is the only global way to change
 * workspace, so a row that matches no group would be unreachable, not merely
 * unlabelled.
 *
 * Run from ui-team with:
 *   node --test tests/ws-list-type-sections.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");
const DESK = read("src/drumee/modules/desk/index.js");

function slice(src, header) {
  const start = src.indexOf(header);
  assert.notEqual(start, -1, `${header} not found`);
  const open = src.indexOf("{", start + header.length - 1);
  let depth = 0;
  for (let j = open; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(start, j + 1);
  }
  assert.fail(`${header} unbalanced`);
}

/** Run the real grouping and report [heading, ...rowNames] in render order. */
function group(rows) {
  const body = slice(DESK, "  _groupWorkspaces(rows) {");
  const _a = new Proxy({}, { get: (_t, k) => String(k) });
  const LOCALE = new Proxy({}, { get: (_t, k) => String(k) });
  // eslint-disable-next-line no-new-func
  const fn = new Function("_a", "LOCALE", `return function (rows) {${
    slice(body, "{").slice(1, -1)};};`)(_a, LOCALE);
  return fn(rows).map((g) => [g.label, ...g.rows.map((r) => r.filename)]);
}

const hub = (filename, area) => ({ filename, area, filetype: "hub", hub_id: filename });
const folder = (filename) => ({ filename, area: "personal", filetype: "folder", id: filename });

test("the four groups render in a fixed order", () => {
  const out = group([
    folder("myfiles"), hub("pub", "public"), hub("ext", "share"), hub("int", "private"),
  ]);
  assert.deepEqual(out.map((g) => g[0]), ["INTERNAL", "EXTERNAL", "PUBLIC", "PERSONAL"],
    "order must not follow the payload's order");
});

test("each area lands in its own group", () => {
  const out = group([hub("int", "private"), hub("ext", "share"), hub("pub", "public"), folder("me")]);
  assert.deepEqual(out, [
    ["INTERNAL", "int"], ["EXTERNAL", "ext"], ["PUBLIC", "pub"], ["PERSONAL", "me"],
  ]);
});

test("dmz is External", () => {
  // hub.js openSettings already pairs share+dmz as the external case.
  const out = group([hub("d", "dmz")]);
  assert.deepEqual(out, [["EXTERNAL", "d"]]);
});

test("restricted is Internal", () => {
  // _fetchWorkspaces admits it, and wm/index.js calls the collaborative set
  // {share, private, restricted, public} — restricted is not outward-facing.
  const out = group([hub("r", "restricted")]);
  assert.deepEqual(out, [["INTERNAL", "r"]]);
});

test("an EMPTY group is not rendered", () => {
  const out = group([hub("only", "private")]);
  assert.deepEqual(out, [["INTERNAL", "only"]], "empty headings would be dangling labels");
});

test("a row matching NO group is still listed, never dropped", () => {
  // The switcher is the only global way to change workspace. A future area, or
  // one with no area at all, must remain reachable.
  const out = group([hub("weird", "some-new-area"), hub("none", undefined), hub("int", "private")]);
  const names = out.flatMap((g) => g.slice(1));
  assert.ok(names.includes("weird"), "an unknown area vanished from the switcher");
  assert.ok(names.includes("none"), "a row with no area vanished from the switcher");
  assert.equal(out[out.length - 1][0], "WORKSPACES",
    "unclassified rows belong under the generic heading, last");
});

test("a personal FOLDER is personal even if it carries another area", () => {
  // filetype decides for folders; _fetchWorkspaces only defaults the area.
  const out = group([{ filename: "f", area: "private", filetype: "folder", id: "f" }]);
  assert.deepEqual(out, [["PERSONAL", "f"]]);
});

test("row order inside a group follows the payload", () => {
  const out = group([hub("b", "private"), hub("a", "private")]);
  assert.deepEqual(out, [["INTERNAL", "b", "a"]], "_fetchWorkspaces already sorted these");
});

test("the feed uses the grouper rather than its own inline split", () => {
  // Anchored on the name, not the full parameter list: the signature gained a
  // `force` flag when the switcher started resyncing on workspace:refresh, and
  // pinning the exact arguments here made an unrelated change fail this test.
  const body = slice(DESK, "  async _renderWorkspaceMenu(");
  assert.match(body, /_groupWorkspaces\(rows\)/);
  assert.ok(!/LOCALE\.WORKSPACES,\s*hubs/.test(body), "the old two-way split is still there");
});
