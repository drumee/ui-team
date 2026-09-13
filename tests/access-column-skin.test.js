// Compiles the two skins and asserts the Access rules. Selectors are the
// compiled form: Dart Sass drops the quotes on simple attribute values
// ([data-view=access]).
const assert = require("node:assert/strict");
const test = require("node:test");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src/drumee");

function compile(file) {
  return execFileSync(
    "sass",
    ["--no-source-map", "-I", ".", "-I", "skin", "-I", path.join(ROOT, "node_modules"), file],
    { cwd: SRC, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
}

// The contents of every `query { … }` block, e.g. an @container.
function blocks(css, query) {
  const out = [];
  let i = css.indexOf(query);
  while (i !== -1) {
    const open = css.indexOf("{", i);
    let depth = 0;
    let j = open;
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) break;
    }
    out.push(css.slice(open + 1, j));
    i = css.indexOf(query, j);
  }
  return out.join("\n");
}

// Declaration blocks of every rule whose selector list includes `selector`.
function rulesFor(css, selector) {
  const out = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").map((s) => s.trim()).includes(selector)) out.push(m[2]);
  }
  return out;
}
const has = (bodies, decl) => bodies.some((b) => b.replace(/\s+/g, " ").includes(decl));

const folder = compile("builtins/window/folder/skin/index.scss");
const restricted = compile("builtins/permission/restricted/skin/index.scss");
const V = ".window-folder__split-body[data-view=access]";

test("the members panel is hidden in the split body by default", () => {
  assert.ok(has(rulesFor(folder, ".window-folder__split-body .permission-restricted__ui"), "display: none"));
});

test("Access keeps the Files grid", () => {
  assert.ok(has(rulesFor(folder, V), "grid-template-columns: var(--files-w, 66.667%) 12px minmax(0, 1fr)"));
});

test("Access hides the chat column and shows the gutter", () => {
  assert.ok(has(rulesFor(folder, `${V} .window__chat-panel`), "display: none"));
  assert.ok(has(rulesFor(folder, `${V} > .window-folder__files-splitter`), "display: flex !important"));
});

test("Access shows the members panel as the chat column's card", () => {
  const card = rulesFor(folder, `${V} > .permission-restricted__ui`);
  assert.ok(has(card, "display: flex"));
  assert.ok(has(card, "border-radius: 8px"));
  assert.ok(has(card, "border: 1px solid rgba(0, 0, 0, 0.05)"));
  assert.ok(has(card, "background: var(--normal-bg-90)"));
});

test("compact Access shows the members panel full width, without the file grid", () => {
  const compact = blocks(folder, "@container window-folder-w (max-width: 700px)");
  const panel = rulesFor(compact, `${V} .permission-restricted__ui`);
  assert.ok(has(panel, "display: flex"));
  assert.ok(has(panel, "width: 100%"));
  assert.ok(has(rulesFor(compact, `${V} .window__files-panel`), "display: none"));
  assert.ok(has(rulesFor(compact, `${V} > .window-folder__files-splitter`), "display: none !important"));
});

test("column mode drops the drawer's dock", () => {
  const col = rulesFor(restricted, ".permission-restricted__ui[data-mode=column]");
  for (const decl of ["position: relative", "right: auto", "width: auto", "height: 100%", "box-shadow: none", "transition: none"]) {
    assert.ok(has(col, decl), decl);
  }
});

test("Access sizes the members panel exactly as Files sizes the chat panel", () => {
  // Same column, same size: whatever the Files view forces on the chat panel —
  // in grid layout and in the flex layout some states render — Access forces
  // on the members panel, and the file grid gets the same share in both.
  const FILES = ".window-folder__split-body[data-view=files]";
  const sizing = ["margin: 0 !important", "max-width: none !important", "min-width: 0 !important", "width: auto !important"];
  for (const decl of [...sizing, "flex: 1 1 0 !important"]) {
    assert.ok(has(rulesFor(folder, `${FILES} > .window__chat-panel`), decl), `chat panel: ${decl}`);
    assert.ok(has(rulesFor(folder, `${V} > .permission-restricted__ui`), decl), `members panel: ${decl}`);
  }
  for (const decl of [...sizing, "flex: 2 1 0 !important"]) {
    assert.ok(has(rulesFor(folder, `${V} > .window__files-panel`), decl), `access file grid: ${decl}`);
  }
});

test("switching the column animates the incoming panel, and not for reduced motion", () => {
  const TO_ACCESS = '.window-folder__split-body[data-view=access][data-from-view=files] > .permission-restricted__ui[data-position="1"]';
  const TO_CHAT = ".window-folder__split-body[data-view=files][data-from-view=access] > .window__chat-panel";
  assert.ok(has(rulesFor(folder, TO_ACCESS), "animation: window-folder__column-in-from-right 0.2s ease-out backwards"));
  assert.ok(has(rulesFor(folder, TO_CHAT), "animation: window-folder__column-in-from-left 0.2s ease-out backwards"));
  assert.match(folder, /@keyframes window-folder__column-in-from-right\s*\{[^}]*translateX\(16px\)/);
  assert.match(folder, /@keyframes window-folder__column-in-from-left\s*\{[^}]*translateX\(-16px\)/);
  const reduced = blocks(folder, "@media (prefers-reduced-motion: reduce)");
  assert.ok(has(rulesFor(reduced, TO_ACCESS), "animation: none"));
  assert.ok(has(rulesFor(reduced, TO_CHAT), "animation: none"));
});

test("the members panel waits for its first reveal, then enters like the switch", () => {
  const ACCESS = ".window-folder__split-body[data-view=access] > .permission-restricted__ui";
  assert.ok(has(rulesFor(folder, `${ACCESS}:not([data-position="1"])`), "visibility: hidden"));
  const ENTERING = `${ACCESS}[data-entering="1"]`;
  assert.ok(has(rulesFor(folder, ENTERING), "animation: window-folder__column-in-from-right 0.2s ease-out backwards"));
  const reduced = blocks(folder, "@media (prefers-reduced-motion: reduce)");
  assert.ok(has(rulesFor(reduced, ENTERING), "animation: none"));
});

test("entering Files, Chat, Task or Meet slides that view's panels in, not for reduced motion", () => {
  const E = '.window-folder__split-body[data-view-entering="1"]';
  const ANIM = "animation: window-folder__column-in-from-right 0.2s ease-out backwards";
  const selectors = [
    `${E}[data-view=files]:not([data-from-view=access]) .window__files-panel`,
    `${E}[data-view=files]:not([data-from-view=access]) .window__chat-panel`,
    `${E}[data-view=chat] .window__thread-rail`,
    `${E}[data-view=chat] .window__chat-panel`,
    `${E}[data-view=chat] .window__file-thread-panel`,
    `${E}[data-view=task] .tasks-panel__ui[data-painted="1"]`,
    `${E}[data-view=meeting] .window-folder__meeting-schedule`,
  ];
  for (const sel of selectors) assert.ok(has(rulesFor(folder, sel), ANIM), sel);
  // The board waits for its first paint: nothing on the bare, still-empty root.
  assert.ok(!has(rulesFor(folder, `${E}[data-view=task] .tasks-panel__ui`), ANIM), "task entrance must wait for data-painted");
  // Reduced motion cancels EXACTLY the animated selectors — a less specific
  // selector loses to them even though it comes later in the file.
  const reduced = blocks(folder, "@media (prefers-reduced-motion: reduce)");
  for (const sel of selectors) assert.ok(has(rulesFor(reduced, sel), "animation: none"), `reduced: ${sel}`);
});
