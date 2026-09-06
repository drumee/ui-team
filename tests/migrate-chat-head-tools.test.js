// The three tools in the mock chat panel's header.
//
// A wrong `ico` is silent: Image.Svg renders `<use href="#--icon-...">`, and a
// name with no symbol behind it produces an empty use — no error, no console
// line, no gap in the layout. So the names are asserted, and asserted IN ORDER,
// because "second item" and "last item" is how they were specified.
const test = require("node:test");
const assert = require("node:assert/strict");
const { execFileSync } = require("node:child_process");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const { renderModule, find, findAll } = require("./helpers/render-skeleton.js");

const ROOT = join(__dirname, "..");
const ui = { fig: { family: "tutorial-migrate", group: "tutorial" }, mget: () => null };
const pane = () =>
  renderModule("src/drumee/modules/desk/tutorial/migrate/skeleton/index.js", ui, { pane: true }, {});

test("the head tools are the kebab, search and the collapse chevron, in that order", () => {
  const tools = find(pane(), "tutorial__fp-chat-head-tools");
  assert.ok(tools, "no head-tools row");
  const icos = findAll(tools, "tutorial__fp-chat-head-ico").map((n) => n.ico);
  assert.deepEqual(icos, ["apps-dots-vertical", "app-search", "app-circle-arrow-right"]);
});

test("every one of those names has a symbol behind it", () => {
  // The check the runtime cannot make for itself. Read from the built sprite
  // source, not the bundle, so this holds without a build.
  const sprite = readFileSync(join(ROOT, "icons/sprites/normalized.sprite.svg"), "utf8");
  const tools = find(pane(), "tutorial__fp-chat-head-tools");
  for (const n of findAll(tools, "tutorial__fp-chat-head-ico")) {
    assert.ok(
      sprite.includes(`id="--icon-${n.ico}"`),
      `${n.ico} is not in the sprite — Image.Svg would render an empty <use>`,
    );
  }
});

test("the glyphs are smaller than their buttons", () => {
  // 21px in a 25px button made the row read as three solid marks rather than
  // three controls. Compiled rather than grepped, so a later override counts.
  const css = execFileSync(
    "sass",
    ["-I", ".", "-I", "skin", "--no-source-map", "modules/desk/tutorial/skin/index.scss"],
    { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 },
  );
  const size = (cls) => {
    const m = new RegExp(`\\.tutorial__fp-chat-head-${cls} \\{[^}]*?width: (\\d+)px`).exec(css);
    assert.ok(m, `no width for ${cls}`);
    return Number(m[1]);
  };
  const ico = size("ico");
  const btn = size("btn");
  assert.ok(ico < btn, `the glyph (${ico}) must be smaller than its button (${btn})`);
  assert.ok(btn - ico >= 6, `and by enough to read as a control (got ${btn - ico}px)`);
});
