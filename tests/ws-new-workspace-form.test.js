#!/usr/bin/env node

/**
 * The switcher's "New workspaces" button opens the WORKSPACE form.
 *
 * Wm's `new-workspace` case picks its form from context: with a workspace open
 * it feeds `folder_form` (a SUBFOLDER form), otherwise `media_form` — which is
 * builtins/media/form, class __form_folder, the widget that renders
 * `.form-folder__main`. That context rule is right for the topbar's "+ New",
 * where "Folder" inside a workspace does mean a subfolder. It is wrong for a
 * button labelled "New workspaces" in a panel that lists workspaces, which hit
 * the subfolder form for anyone with a workspace open — i.e. almost always.
 *
 * So the switcher raises its own service and Wm is told to force the workspace
 * form; every other caller keeps the context rule untouched.
 *
 * Run from ui-team with:
 *   node --test tests/ws-new-workspace-form.test.js
 */

const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const REPO_ROOT = join(__dirname, "..");
const read = (p) => readFileSync(join(REPO_ROOT, p), "utf8");

const TOPBAR = read("src/drumee/modules/desk/skeleton/topbar.js");
const DESK = read("src/drumee/modules/desk/index.js");
const WM = read("src/drumee/modules/desk/wm/index.js");
const SEEDS = read("src/drumee/seeds.js");

const strip = (t) =>
  t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/[^\n]*/g, "$1");

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

// ── the vocabulary ──────────────────────────────────────────────────────────

test("media_form is the kind that renders .form-folder__main", () => {
  // The whole point of the change, so it is worth pinning rather than assuming.
  assert.match(SEEDS, /media_form:[\s\S]{0,80}builtins\/media\/form/);
  const widget = read("src/drumee/builtins/media/form/index.js");
  assert.match(widget, /class __form_folder/);
  const skin = read("src/drumee/builtins/media/form/skin/index.scss");
  assert.match(skin, /\.form-folder\s*\{/);
  // And folder_form is a DIFFERENT widget — the subfolder form.
  assert.match(SEEDS, /folder_form:[\s\S]{0,80}builtins\/media\/folder-form/);
});

// ── the button ──────────────────────────────────────────────────────────────

test("the button raises its own service, not the shared one", () => {
  const sw = slice(TOPBAR, "function workspaceSwitcher(pfx, ui) {");
  const btn = sw.slice(sw.indexOf("__ws-new"));
  assert.match(btn, /service:\s*"new-workspace-form"/);
});

test("the + New menu still raises the shared service", () => {
  // It lives in create-items.js (shared by the topbar add-menu and the mobile
  // drawer), NOT in topbar.js — overloading `new-workspace` would have changed
  // both, where the context rule is correct.
  const items = read("src/drumee/modules/desk/skeleton/create-items.js");
  assert.match(items, /service:\s*"new-workspace"/,
    "the add-menu no longer raises new-workspace");
  // And the switcher is now the only thing in topbar.js raising a create.
  const sw = slice(TOPBAR, "function workspaceSwitcher(pfx, ui) {");
  assert.ok(!/service:\s*"new-workspace"\s*,/.test(sw),
    "the switcher must not still raise the shared service");
});

// ── the desk hop ────────────────────────────────────────────────────────────

test("the desk keeps the write gate and forwards the flag", () => {
  const c = strip(DESK.slice(DESK.indexOf('case "new-workspace-form"')));
  const body = c.slice(0, c.indexOf("case ", 30));
  assert.match(body, /guardWrite\("write"\)/, "the write gate was dropped");
  assert.match(body, /closeDeskNewMenu\(cmd\)/, "the panel must close behind the modal");
  assert.match(body, /force_workspace:\s*1/);
  assert.match(body, /service:\s*"new-workspace"/,
    "must delegate to Wm's case, which owns the wrapper-modal plumbing");
});

test("the guided flow's post_override still rides along", () => {
  const c = strip(DESK.slice(DESK.indexOf('case "new-workspace-form"')));
  assert.match(c.slice(0, c.indexOf("case ", 30)), /_createFormOverrides\(\)/,
    "activate-workspace's Step 1 handoff would break");
});

// ── Wm's choice ─────────────────────────────────────────────────────────────

/** Evaluate the real form-choice expression against a fake Wm. */
function chooseKind({ curWorkspace, force }) {
  const body = strip(slice(WM, '      case "new-workspace":'));
  const m = body.match(/const skel\s*=([\s\S]*?);\n/);
  assert.ok(m, "the form-choice expression was not found");
  // eslint-disable-next-line no-new-func
  const fn = new Function("self", "args", `const _curWorkspace = self._curWorkspace; return (${
    m[1].replace(/this\._curWorkspace/g, "self._curWorkspace")});`);
  return fn({ _curWorkspace: curWorkspace }, force ? { force_workspace: 1 } : {}).kind;
}

test("forced: the WORKSPACE form even with a workspace open", () => {
  assert.equal(
    chooseKind({ curWorkspace: { hub_id: "H", nid: "N" }, force: true }),
    "media_form",
    "this is the bug — the switcher opened the subfolder form",
  );
});

test("unforced with a workspace open: still the subfolder form", () => {
  assert.equal(
    chooseKind({ curWorkspace: { hub_id: "H", nid: "N" }, force: false }),
    "folder_form",
    "the topbar's + New must keep its context rule",
  );
});

test("unforced at home: the workspace form, as before", () => {
  assert.equal(chooseKind({ curWorkspace: null, force: false }), "media_form");
});

test("forced at home: still the workspace form", () => {
  assert.equal(chooseKind({ curWorkspace: null, force: true }), "media_form");
});
