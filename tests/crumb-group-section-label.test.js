// The address chip stops spinning when a SECTION screen names itself.
//
// The chip's busy state carries no JS flag: desk/skin/topbar.scss paints an
// `::after` spinner and hides `.desk-breadcrumb__main` until a `:has()` rule
// says the address is up. That rule asked for an ICON as well as a name, and a
// section label — Organization, Settings, Get help, Trash, Inbox, Contacts,
// Admin console, Plan — has no glyph to give: breadcrumb/item/skeleton pushes
// the folder art only `if (!isSection)`, because a label has no node behind it.
//
// So the chip spun forever on EVERY section screen with its own label hidden
// underneath it, from the day the `:has()` rules landed (c41c76f4, 2026-09-08).
// The org dropdown's "Open" is where it was caught.
//
// Measured in tests/harness/crumb-group-section-spinner.js — the three states
// (path / section / no crumbs at all) with their spinner, track and caret.
const test = require("node:test");
const assert = require("node:assert");
const { execFileSync } = require("node:child_process");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const sass = (e) => execFileSync("sass", ["-I", ".", "-I", "skin", "--no-source-map", e],
  { cwd: join(ROOT, "src/drumee"), encoding: "utf8", maxBuffer: 1 << 26 });

test("a section label counts as an address, so the chip stops spinning", () => {
  const css = sass("modules/desk/skin/index.scss");

  // The reveal rule reached from the section side. A DESCENDANT combinator,
  // unlike the icon/name pair beside it: the name sits INSIDE
  // .breadcrumb-item__main--section rather than next to it.
  const sel = ".desk-module-topbar__crumb-group:has(.breadcrumb-item__main--section .breadcrumb-item__filename)";
  const i = css.indexOf(sel);
  assert.ok(i > 0, "nothing clears the spinner for a section label");

  // It must reveal the TRACK, not merely stop the spinner: the base rule hides
  // .desk-breadcrumb__main, so a half fix leaves a chip that is blank instead
  // of busy.
  assert.ok(
    css.includes(`${sel} .desk-breadcrumb__main`),
    "the spinner stops but the label stays hidden",
  );
  assert.ok(
    new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "::after")
      .test(css),
    "the ::after spinner is not taken back for a section label",
  );

  // AND IT STILL ASKS FOR A NAME. An empty section crumb is as unfinished as a
  // glyph with no name; `:has(.breadcrumb-item__main--section)` alone would
  // reveal a blank chip the moment the crumb existed.
  assert.ok(
    !/:has\(\.breadcrumb-item__main--section\)/.test(css),
    "a section crumb with no label yet must stay hidden",
  );

  // The genuinely-loading state is untouched: no crumbs in the chip at all
  // still spins, which is the only thing the spinner is for.
  const base = css.indexOf(".desk-module-topbar__crumb-group::after");
  assert.ok(base > 0, "the base spinner is gone — nothing marks the chip busy");
  assert.match(css.slice(base, css.indexOf("}", base)), /animation:\s*crumb-loading-spin/);
});

test("a section crumb renders a name and no glyph, which is what the rule reads", () => {
  // The CSS above is only correct because of this. If the skeleton ever draws a
  // glyph for a section label, the icon/name pair covers it and the second
  // selector becomes dead weight — this is what will say so.
  const { installGlobals, installResolver, toHtml } = require("./helpers/render-skeleton.js");
  const restoreG = installGlobals();
  const restoreR = installResolver();
  try {
    const p = require.resolve(
      join(ROOT, "src/drumee/modules/desk/breadcrumb/item/skeleton/index.js"));
    delete require.cache[p];
    const item = require(p);
    const ui = (over) => ({
      fig: { family: "breadcrumb-item" },
      getIndex: () => 0,
      mget: (k) => over[k],
    });

    const section = toHtml(item(ui({ filename: "Organization", isSection: 1 })));
    assert.match(section, /breadcrumb-item__filename/);
    assert.ok(!/breadcrumb-item__icon/.test(section), "a section label drew a glyph");
    assert.match(section, /breadcrumb-item__main--section/,
      "the section crumb no longer carries the class the CSS reads");

    // The path crumb still brings both, which is what keeps the first selector
    // meaningful.
    const path = toHtml(item(ui({
      filename: "Acme Workspace", filetype: "hub", area: "private", home_id: "7", hub_id: "7",
    })));
    assert.match(path, /breadcrumb-item__icon/);
    assert.match(path, /breadcrumb-item__filename/);
  } finally { restoreR(); restoreG(); }
});
