#!/usr/bin/env node

/**
 * The folder topbar's view toggle — Figma 85:36284 ("filter-bar").
 *
 * Spec, read from the design:
 *   container  bg white, 1px rgba(0,0,0,0.05), radius 12, three 36px segments
 *   segment    36x36, radius 5.833; the ACTIVE one is #5950FF at radius 12
 *   glyphs     TreeView 17px, List 17.5px, SquaresFour 17.5px
 *
 * `#5950FF` is --primary-40 and `rgba(0,0,0,0.05)` is --border-muted in the
 * light theme, so both are asserted as tokens rather than hexes.
 *
 * Run from ui-team with:
 *   node --test tests/folder-view-toggle.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");
const SCSS = read("src/drumee/builtins/window/folder/skin/index.scss");
const TOOLKIT = read("src/drumee/builtins/window/skeleton/toolkit/index.js");

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

// ── geometry ────────────────────────────────────────────────────────────────

test("the container matches the frame", () => {
  const r = slice(SCSS, "    &__view-toggle {");
  assert.match(r, /height:\s*36px/, "36px tall in the frame");
  assert.match(r, /border-radius:\s*12px/);
  assert.match(r, /border:\s*1px solid var\(--border-muted\)/,
    "rgba(0,0,0,0.05) is --border-muted; a hex would not follow the theme");
});

test("segments are 36px squares", () => {
  const r = slice(SCSS, "    &__view-toggle-seg {");
  assert.match(r, /width:\s*36px/);
  assert.match(r, /height:\s*36px/);
  assert.match(r, /flex:\s*0 0 36px/, "a flex basis left at 30px would squash them");
});

test("the container is wide enough for three of them", () => {
  const r = slice(SCSS, "    &__view-toggle {");
  const w = r.match(/width:\s*(\d+)px/);
  assert.ok(w, "no width");
  assert.ok(Number(w[1]) >= 108, `width ${w[1]}px cannot hold 3 x 36px`);
});

// ── the active segment ──────────────────────────────────────────────────────

test("the active segment is the brand fill at the container's radius", () => {
  const at = SCSS.indexOf('&__view-toggle[data-state="group"]');
  const rule = SCSS.slice(at, at + 700);
  assert.match(rule, /background-color:\s*var\(--primary-40\)/, "#5950FF is --primary-40");
  assert.match(rule, /color:\s*var\(--white\)/);
  assert.match(rule, /border-radius:\s*12px/,
    "the frame rounds the ACTIVE segment to 12px, not the inactive 5.833px");
});

test("inactive segments keep the frame's smaller radius", () => {
  const r = slice(SCSS, "    &__view-toggle-seg {");
  assert.match(r, /border-radius:\s*5\.833px/);
});

// ── icon sizes ──────────────────────────────────────────────────────────────

test("glyphs are sized per the frame, not left at 14px", () => {
  const r = slice(SCSS, "    &__view-toggle-glyph {");
  assert.match(r, /width:\s*17\.5px/, "List and SquaresFour are 17.5px");
  assert.ok(!/1[34]px/.test(r), "still at the old 14px");
  // TreeView is 17px in the frame — half a pixel smaller than the other two.
  const at = SCSS.indexOf("__view-toggle-seg--group .window-folder-topbar__view-toggle-glyph");
  assert.notEqual(at, -1, "the tree glyph's own size is missing");
  assert.match(SCSS.slice(at, at + 160), /width:\s*17px/);
});

// ── the default ─────────────────────────────────────────────────────────────

test("grid is the LAST mode, and the default when nothing is chosen", () => {
  const body = slice(TOOLKIT, "function fileViewToggle(ui, opt = {}) {");
  // The three-mode call site orders them group, list, grid.
  const call = TOOLKIT.slice(TOOLKIT.indexOf("namedState: true"));
  const modes = [...call.slice(0, 400).matchAll(/mode:\s*"(\w+)"/g)].map((m) => m[1]);
  assert.deepEqual(modes, ["group", "list", "grid"], "grid must be last");
  // And with neither grouping nor row mode set, state resolves to grid.
  const m = body.match(/const state\s*=([\s\S]*?);\n/);
  assert.ok(m, "state expression not found");
  // eslint-disable-next-line no-new-func
  const fn = new Function("opt", "isGrouped", "ui", "listMode", "_a",
    `return (${m[1].replace(/opt\.namedState/g, "true")});`);
  assert.equal(fn({ namedState: true }, () => false, {}, false, {}), "grid",
    "a fresh window must land on grid");
});

test("the toggle defaults to grid even if a previous window chose otherwise", () => {
  // getViewMode falls back to a MODULE-LEVEL default that setViewMode
  // overwrites, so without pinning it a window opened after someone switched
  // to list would come up in list.
  const utils = read("src/drumee/builtins/window/utils.js");
  assert.match(utils, /ViewMode\.set\(DEFAULT,\s*_a\.icon\)/,
    "the module default must be icon (grid)");
});
