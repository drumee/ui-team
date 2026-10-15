// font-main-sync.test.js — no SCSS under src/drumee names a text font other
// than var(--font-main) (or an alias of it). Allowlist below is deliberate.
//
//   node --test tests/font-main-sync.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const SRC = path.join(__dirname, "..", "src/drumee");
const walk = (d) =>
  fs.readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(d, e.name))
      : e.name.endsWith(".scss") ? [path.join(d, e.name)] : []);

// Values that resolve to var(--font-main).
const OK = [
  /^var\(--font-main\)$/, /^inherit$/,
  /^\$(font|otp-font|font-stack)$/, /^styles\.\$jse-font$/,
  /^var\(--(sb-font-body|dmz-popup-font)\)$/,
];
// Not text, or not ours to restyle — keep their own family.
const ALLOW = {
  "builtins/widget/chat-item/skin/reactions.scss": /Emoji/, // glyphs Armin lacks
  "modules/sandbox/skin/jsoneditor.scss": /^styles\.\$jse-font-mono$/, // code editor
};
// Alias definitions must point at the token, nothing else.
const ALIAS_DEF = /(?:\$(?:font|otp-font|font-stack|jse-font)|--(?:sb-font-body|sb-font-mono|dmz-popup-font))\s*:\s*([^;]+);/g;

function scanFamilies(text) {
  const t = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
  const out = [];
  for (const m of t.matchAll(/(?:^|[\s;{])font(-family)?\s*:\s*([^;{}]+)/g)) {
    let v = m[2].replace(/\s+/g, " ").trim().replace(/\s*!important$/, "");
    if (!m[1] && v !== "inherit") v = v.replace(/^.*?\b[\d.]+(px|em|rem|%)(\/\S+)?\s+/, "");
    out.push(v);
  }
  return out;
}

test("scanner: shorthand, comments, multi-line", () => {
  assert.deepEqual(scanFamilies("a{font: 600 13px/1.2 $font;}"), ["$font"]);
  assert.deepEqual(scanFamilies("a{font: 12px Arial;}"), ["Arial"]);
  assert.deepEqual(scanFamilies('a{\n// font-family: "Roboto";\n/* font-family: X; */}'), []);
  assert.deepEqual(scanFamilies('a{font-family: "A",\n  "B";}'), ['"A", "B"']);
});

test("every text font-family under src/drumee is var(--font-main)", () => {
  const bad = [];
  for (const f of walk(SRC)) {
    const rel = path.relative(SRC, f);
    for (const v of scanFamilies(fs.readFileSync(f, "utf8"))) {
      if (OK.some((r) => r.test(v)) || (ALLOW[rel] && ALLOW[rel].test(v))) continue;
      bad.push(`${rel} :: ${v}`);
    }
  }
  assert.deepEqual(bad, []);
});

test("local font aliases are defined as var(--font-main)", () => {
  const bad = [];
  for (const f of walk(SRC)) {
    const rel = path.relative(SRC, f);
    for (const m of fs.readFileSync(f, "utf8").matchAll(ALIAS_DEF)) {
      const v = m[1].replace(/\s+/g, " ").trim();
      if (v === "var(--font-main)") continue;
      if (rel === "modules/sandbox/skin/styles.scss") continue; // $jse-font-mono lives here
      bad.push(`${rel} :: ${m[0].replace(/\s+/g, " ")}`);
    }
  }
  assert.deepEqual(bad, []);
});
