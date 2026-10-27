// tests/help-main-responsive-skin.test.js — the Get help screen (help_main)
// reflows on tablet and phone. Its breakpoints are container queries on
// help-main__ui (the screen sits beside the desk sidebar, so the viewport says
// nothing about its width), and it stacks by wrapping: the framework owns
// flex-direction on Box elements (ui-team CLAUDE.md), and the old
// `flex-direction` overrides lost to `.box[data-flow]` and never applied.
//
//   node --test tests/help-main-responsive-skin.test.js
//
// Compiles the REAL skin with sass and reads the rules; headless Chromium is
// the visual check (see the plan).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sass = require("sass");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src/drumee");
const HELP = "builtins/widget/help/main";

function compile(rel) {
  return sass.compile(path.join(SRC, rel), {
    loadPaths: [SRC, path.join(SRC, "skin"), path.join(ROOT, "skin")],
    style: "compressed",
    logger: sass.Logger.silent,
  }).css;
}

const css = compile(`${HELP}/skin/index.scss`);

// Declarations of every top-level rule (outside any at-rule) whose selector
// list holds `sel`.
function declsFor(sel) {
  return rulesIn(stripBlocks(css), sel);
}

// Declarations of `sel` inside the @media / @container blocks whose prelude
// starts with `prefix` (compressed spelling).
function inMedia(prefix, sel) {
  return inBlocks("media", prefix, sel);
}

function inContainer(prefix, sel) {
  return inBlocks("container", prefix, sel);
}

function inBlocks(kind, prefix, sel) {
  return blocks(css)
    .filter((b) => b.kind === kind && b.prelude.startsWith(prefix))
    .map((b) => rulesIn(b.body, sel))
    .join(";");
}

function rulesIn(text, sel) {
  // Compressed output drops the quotes around an identifier attribute value
  // (mobile), but keeps them around one that starts with a digit ("0").
  sel = sel.replace(/="([a-z_][\w-]*)"/gi, "=$1");
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(text))) {
    if (m[1].split(",").map((s) => s.trim()).includes(sel)) out.push(m[2]);
  }
  return out.join(";");
}

// Top-level at-rule blocks, found by brace matching.
function blocks(text) {
  const out = [];
  const re = /@(media|container|keyframes|supports)([^{]*)\{/g;
  let m;
  while ((m = re.exec(text))) {
    let depth = 1;
    let i = re.lastIndex;
    while (depth && i < text.length) {
      if (text[i] === "{") depth++;
      else if (text[i] === "}") depth--;
      i++;
    }
    out.push({ kind: m[1], prelude: m[2].trim(), start: m.index, end: i, body: text.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  return out;
}

function stripBlocks(text) {
  let out = "";
  let at = 0;
  for (const b of blocks(text)) {
    out += text.slice(at, b.start);
    at = b.end;
  }
  return out + text.slice(at);
}

test("help-main__ui is the size container", () => {
  const d = declsFor(".help-main__ui");
  assert.match(d, /container-type:inline-size/);
  assert.match(d, /container-name:help-main/);
});

test("no flex-direction on Box elements anywhere in the skin", () => {
  assert.doesNotMatch(css, /help-main__(main|nav-list|feedback-row)\{[^}]*flex-direction/);
});

test("stacks below 800px by wrapping", () => {
  const at = "help-main (max-width: 800px)";
  const main = inContainer(at, ".help-main__main");
  assert.match(main, /flex-wrap:wrap/);
  assert.match(main, /align-content:flex-start/);
  assert.match(main, /overflow-y:auto/);
  assert.match(inContainer(at, ".help-main__nav-column"), /flex:0 0 100%/);
  const content = inContainer(at, ".help-main__content");
  assert.match(content, /flex:1 1 100%/);
  assert.match(content, /height:auto/);
});

test("no viewport @media left except reduced-motion and the phone rail block", () => {
  const preludes = blocks(css)
    .filter((b) => b.kind === "media")
    .map((b) => b.prelude);
  for (const p of preludes) {
    assert.ok(["(prefers-reduced-motion: reduce)", "(max-width: 650px)"].includes(p), p);
  }
});

