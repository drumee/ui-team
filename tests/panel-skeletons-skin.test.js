// Every column panel that has to wait for a service holds its place with a
// loading skeleton instead of sitting blank: the team chat, the task board,
// the Meet schedule and the workspace-members panel. They share one
// implementation (skin/mixins/drumee: skeleton-layer / skeleton-content-in),
// so these assertions are mostly about each panel being WIRED to the right
// "I have something to show" stamp — the part that differs per panel.
//
// Selectors are the compiled form: Dart Sass drops the quotes on simple
// attribute values ([data-painted=1]).
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

function rulesFor(css, selector) {
  const out = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(",").map((s) => s.trim()).includes(selector)) out.push(m[2]);
  }
  return out;
}
const has = (bodies, decl) => bodies.some((b) => b.replace(/\s+/g, " ").includes(decl));

// A rule inside @media (prefers-reduced-motion: reduce).
function reducedMotion(css) {
  const out = [];
  const q = "@media (prefers-reduced-motion: reduce)";
  let i = css.indexOf(q);
  while (i !== -1) {
    const open = css.indexOf("{", i);
    let depth = 0;
    let j = open;
    for (; j < css.length; j++) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}" && --depth === 0) break;
    }
    out.push(css.slice(open + 1, j));
    i = css.indexOf(q, j);
  }
  return out.join("\n");
}

const folder = compile("builtins/window/folder/skin/index.scss");
const tasks = compile("builtins/window/tasks/skin/index.scss");
const restricted = compile("builtins/permission/restricted/skin/index.scss");

// Each panel: [label, compiled css, the ::after selector, the selector that
// hides the panel's own content while the skeleton is up].
const PANELS = [
  [
    "team chat",
    folder,
    '.window-folder__split-body .window__chat-panel:not(:has(.window__chat-widget[data-painted="1"]))',
  ],
  ["task board", tasks, '.tasks-panel__ui:not([data-painted="1"])'],
  ["Meet schedule", folder, '.window-folder__meeting-schedule:not([data-painted="1"])'],
  [
    "members panel",
    restricted,
    '.permission-restricted__ui[data-mode=column]:not([data-position="1"])',
  ],
];

for (const [label, css, waiting] of PANELS) {
  test(`the ${label} draws a skeleton until it has something to show`, () => {
    const layer = rulesFor(css, `${waiting}::after`);
    assert.ok(layer.length, `no skeleton layer for ${waiting}`);
    assert.ok(has(layer, 'content: ""'));
    assert.ok(has(layer, "position: absolute"));
    assert.ok(has(layer, "inset: 0"));
    // A mask over a theme colour, so the skeleton follows light and dark
    // rather than painting fixed grey shapes.
    assert.ok(has(layer, "background-color: var(--border-default, #e5e5ea)"));
    assert.ok(has(layer, "mask: url(\"data:image/svg+xml,"), "skeleton shapes are an SVG mask");
    assert.ok(has(layer, "animation: drumee-skeleton-pulse 1.2s ease-in-out infinite"));
    // Never intercepts a click meant for the panel underneath.
    assert.ok(has(layer, "pointer-events: none"));
  });

  test(`the ${label} holds its own content back while the skeleton is up`, () => {
    assert.ok(has(rulesFor(css, `${waiting} > *`), "visibility: hidden"));
  });

  // inset: 0 is measured against the nearest POSITIONED ancestor. A host that
  // is not one lets its skeleton stretch over half the window instead.
  test(`the ${label} is a positioning context for its skeleton`, () => {
    const positioned = (sel) =>
      rulesFor(css, sel).some((b) => /position:\s*(relative|absolute|fixed|sticky)/.test(b));
    const host = waiting.replace(/:not\(.*\)$/, "");
    assert.ok(
      positioned(waiting) || positioned(host),
      `${host} is not positioned; its skeleton would size to an ancestor`,
    );
  });

  test(`the ${label} stops pulsing under reduced motion`, () => {
    assert.ok(
      has(rulesFor(reducedMotion(css), `${waiting}::after`), "animation: none"),
      `${waiting}::after keeps animating under reduced motion`,
    );
  });
}

test("each panel's content fades in when it lands", () => {
  const fade = "animation: drumee-skeleton-content-in 0.2s ease-out backwards";
  const chat = '.window-folder__split-body .window__chat-panel:has(.window__chat-widget[data-painted="1"])';
  assert.ok(has(rulesFor(folder, `${chat} > .window__chat-widget`), fade));
  assert.ok(has(rulesFor(tasks, '.tasks-panel__ui[data-painted="1"] > .tasks-panel__root'), fade));
  assert.ok(has(rulesFor(folder, '.window-folder__meeting-schedule[data-painted="1"] > *'), fade));
  assert.ok(
    has(
      rulesFor(
        restricted,
        '.permission-restricted__ui[data-mode=column][data-position="1"] > .permission-restricted__main',
      ),
      fade,
    ),
  );
});

test("the shared keyframes ship with every skin that uses them", () => {
  for (const [label, css] of [["folder", folder], ["tasks", tasks], ["restricted", restricted]]) {
    assert.match(css, /@keyframes drumee-skeleton-pulse/, `${label} is missing the pulse keyframes`);
    assert.match(css, /@keyframes drumee-skeleton-content-in/, `${label} is missing the fade keyframes`);
  }
});

// The members panel used to be hidden outright until its rows landed, which is
// what the skeleton replaces: a card that holds its shape beats a blank one.
test("the members panel is no longer blanked while it loads", () => {
  const hidden = rulesFor(
    folder,
    '.window-folder__split-body[data-view=access] > .permission-restricted__ui:not([data-position="1"])',
  );
  assert.equal(hidden.length, 0, "the folder skin still blanks the unloaded members panel");
});
