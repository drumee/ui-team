// The organisation screen draws no address chip.
//
// It is the one section screen whose name is ALREADY in the bar: the org chip
// sits two elements to its left in the same cluster and reads "Acme
// Corporation". An address chip beside it printing the same words again — with
// a "/" and a cursor that go nowhere — is noise, so desk._openOrgView asks for
// the chip to be dropped rather than labelled. Every other section screen
// (Settings, Get help, Trash, Inbox, Contacts, Admin console, Plan) keeps its
// label, because nothing else in the bar says where the user is.
//
// A FLAG, IN A FILE WHOSE HISTORY IS THREE FAILED FLAGS. tests/
// crumb-loading.test.js records why the chip's READINESS is asked of the DOM
// instead: a readiness flag has to be written and cleared across a lazy chunk
// load, an ensurePart promise and ten broadcast paths, and every one of those
// is a moment when it can be stale. This is not that kind of flag. It records a
// DECISION, taken in the same synchronous call that supplies the label, by the
// same function that repaints the track — so the next repaint, section or path,
// re-decides it. There is no interval in which it can disagree with what is on
// screen.
//
// Measured in tests/harness/crumb-group-section-spinner.js, which renders the
// chip against the real compiled skin and reports offsetWidth 0.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

const ROOT = join(__dirname, "..");
const BC = join(ROOT, "src/drumee/modules/desk/breadcrumb/index.js");
const DESK = join(ROOT, "src/drumee/modules/desk/index.js");
const SKIN = join(ROOT, "src/drumee/modules/desk/skin/topbar.scss");

// Same lift as tests/crumb-loading.test.js: run a real method body without
// booting the desk.
function lift(file, signature, params = [], args = []) {
  const src = readFileSync(file, "utf8");
  const re = new RegExp(
    `\\n {2}${signature.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([\\s\\S]*?)\\n {2}\\}\\n`,
  );
  const m = src.match(re);
  assert.ok(m, `${signature} not found in ${file}`);
  const inner = signature.slice(signature.indexOf("("));
  return new Function(...params, `return function ${inner} {\n${m[1]}\n};`)(...args);
}

test("_setSectionMode stamps the chip-off flag, and only for a section", () => {
  const set = lift(BC, "_setSectionMode(section, hideAddress)");
  const el = { dataset: {} };
  const self = { el };

  set.call(self, true, 1);
  assert.equal(el.dataset.section, 1);
  assert.equal(el.dataset.hideAddress, 1);

  // CLEARED, not left at 0: the CSS matches [data-hide-address="1"], and a
  // stamp that only ever changes value is one a `:has([data-hide-address])`
  // written later would read as still set.
  set.call(self, true);
  assert.equal(el.dataset.section, 1);
  assert.ok(!("hideAddress" in el.dataset), "the flag survived a plain section");

  // A PATH never hides the chip, whatever it is asked — the address is the
  // whole point of the chip there.
  set.call(self, true, 1);
  set.call(self, false, 1);
  assert.equal(el.dataset.section, 0);
  assert.ok(!("hideAddress" in el.dataset), "a path with the flag hid its own address");

  // Still a section as far as the desk is concerned, which is what makes
  // _leaveSectionScreen rebuild the workspace path on the way out.
  set.call(self, true, 1);
  assert.equal(self._section, true);
});

test("_updateContext reads the flag off the raw payload", () => {
  // It has to be read BEFORE _normalizeData, which keeps only PROPERTIES — the
  // crumb's own node fields. Normalising first drops it silently and the chip
  // is drawn with a redundant label, which is the bug this guards.
  const lodash = require("lodash");
  const update = lift(BC, "_updateContext(data)", ["_"], [lodash]);
  const calls = [];
  const self = {
    _normalizeData: (d) => [].concat(d),
    _buildContent: (data, opt) => calls.push({ data, opt }),
    loadDefault: () => calls.push({ def: 1 }),
  };

  update.call(self, { filename: "Acme Corporation", hideAddress: 1 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].opt.section, true);
  assert.equal(calls[0].opt.hideAddress, true);

  // Every other section screen sends {filename} alone and keeps its label.
  calls.length = 0;
  update.call(self, { filename: "Get help" });
  assert.equal(calls[0].opt.section, true);
  assert.equal(calls[0].opt.hideAddress, false);

  // A context crumb carrying node identity is a WORKSPACE, not a section — the
  // switcher's change-workspace row hands its whole model in. It is not a
  // section and must not be hidden even if the flag rides along.
  calls.length = 0;
  update.call(self, { filename: "Acme Workspace", filetype: "hub", hideAddress: 1 });
  assert.equal(calls[0].opt.section, false);
});

test("only the org view asks for it", () => {
  const src = readFileSync(DESK, "utf8");
  // CODE lines only. This counted every line naming the flag, comments
  // included, and so failed the moment a nearby comment referred to it by name
  // — which says nothing about how many places ASK for it. The claim being
  // made is about callers.
  const hits = src.split("\n")
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => /hideAddress/.test(l) && !/^\s*(\/\/|\*|\/\*)/.test(l));
  assert.equal(hits.length, 1,
    `hideAddress is asked for in more than one place: lines ${hits.map((h) => h.i + 1).join(", ")}`);

  // And it is inside _openOrgView, not some neighbouring section opener.
  const from = src.indexOf("\n  _openOrgView(");
  const body = src.slice(from, src.indexOf("\n  }\n", from));
  assert.match(body, /hideAddress:\s*1/);
  assert.match(body, /breadcrumb:context/, "the flag must ride the label's own broadcast");
});

test("the skin drops the whole chip, not just its contents", () => {
  const css = readFileSync(SKIN, "utf8");
  const i = css.indexOf('&__crumb-group:has(> .desk-breadcrumb__ui[data-hide-address="1"])');
  assert.ok(i > 0, "nothing hides the chip for the org view");
  const block = css.slice(i, css.indexOf("\n  }\n", i));

  // `display: none`, so the box stops taking room — an emptied chip still eats
  // its own padding and still paints a ground on hover. `!important` because a
  // Box child can arrive with an inline display.
  assert.match(block, /display:\s*none\s*!important/);

  // On the CHIP. Hiding the breadcrumb inside it would leave the chip's own
  // `::after` spinner painted on an otherwise empty box — which is the state
  // this whole area was just fixed out of.
  assert.ok(!/desk-breadcrumb__main/.test(block), "this must not hide the track instead");
});
