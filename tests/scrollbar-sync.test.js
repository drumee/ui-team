// scrollbar-sync.test.js — one scrollbar for the whole app.
//
//   node --test tests/scrollbar-sync.test.js
//
// The floor in router/skin/index.scss gives every element the canonical thin
// bar on the theme tokens. Anything else that styles a bar drifts from it, so
// this scans every SCSS file under src/ and fails on: a scrollbar-color that is
// not the canonical pair, a scrollbar-width other than thin/none, and any
// ::-webkit-scrollbar rule outside the floor that does more than hide the bar.
// A webkit-only hide is also a failure: Chrome ignores ::-webkit-scrollbar once
// scrollbar-width is set (and the floor sets it on everything), so the bar
// would show — the owning rule has to say scrollbar-width: none too.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const CANON_COLOR =
  "var(--scrollbar-thumb, rgba(0, 0, 0, 0.22)) var(--scrollbar-track, transparent)";
const FLOOR = "src/drumee/router/skin/index.scss";
// Hover-reveal regions: the bar is transparent at rest and canonical on hover.
const REVEAL_OK = [
  "src/drumee/builtins/panel/calendar/skin/index.scss",
  "src/drumee/builtins/window/tasks/skin/index.scss",
];

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith(".scss")) out.push(p);
  }
  return out;
}

// Blank out comments, keeping offsets (so line numbers survive). `//` inside a
// url( ... ) or a string is left alone.
function stripComments(src) {
  let out = "";
  let i = 0;
  let quote = null;
  let paren = 0;
  while (i < src.length) {
    const c = src[i];
    if (quote) {
      out += c;
      if (c === quote && src[i - 1] !== "\\") quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'") { quote = c; out += c; i++; continue; }
    if (c === "(") paren++;
    if (c === ")") paren = Math.max(0, paren - 1);
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      const stop = end < 0 ? src.length : end + 2;
      out += src.slice(i, stop).replace(/[^\n]/g, " ");
      i = stop;
      continue;
    }
    if (c === "/" && src[i + 1] === "/" && paren === 0) {
      const end = src.indexOf("\n", i);
      const stop = end < 0 ? src.length : end;
      out += " ".repeat(stop - i);
      i = stop;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

const lineOf = (src, idx) => src.slice(0, idx).split("\n").length;
const norm = (v) => v.replace(/\s+/g, " ").replace(/\s*!important/, "").trim();

// Body of the block opened by the `{` at `open` (exclusive of braces).
function blockAt(src, open) {
  let depth = 0;
  for (let i = open; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}" && --depth === 0) return src.slice(open + 1, i);
  }
  return src.slice(open + 1);
}

// Index of the `{` that encloses position `idx`.
function enclosingOpen(src, idx) {
  let depth = 0;
  for (let i = idx - 1; i >= 0; i--) {
    if (src[i] === "}") depth++;
    else if (src[i] === "{") {
      if (depth === 0) return i;
      depth--;
    }
  }
  return -1;
}

// The block's own declarations, nested blocks removed.
const ownBody = (body) => {
  let out = "";
  let depth = 0;
  for (const c of body) {
    if (c === "{") depth++;
    else if (c === "}") depth--;
    else if (depth === 0) out += c;
  }
  return out;
};

const FILES = walk(path.join(ROOT, "src")).map((abs) => {
  const rel = path.relative(ROOT, abs).split(path.sep).join("/");
  return { rel, src: stripComments(fs.readFileSync(abs, "utf8").replace(/\r\n/g, "\n")) };
});

function report(violations) {
  assert.equal(violations.length, 0, "\n" + violations.join("\n"));
}

test("every scrollbar-color is the canonical value", () => {
  const v = [];
  for (const { rel, src } of FILES) {
    for (const m of src.matchAll(/(?<![-\w])scrollbar-color\s*:\s*([^;}]+)/g)) {
      const val = norm(m[1]);
      if (val === CANON_COLOR) continue;
      if (val === "transparent transparent" && REVEAL_OK.includes(rel)) continue;
      v.push(`${rel}:${lineOf(src, m.index)} scrollbar-color: ${val}`);
    }
  }
  report(v);
});

test("every scrollbar-width is thin or none", () => {
  const v = [];
  for (const { rel, src } of FILES) {
    for (const m of src.matchAll(/(?<![-\w])scrollbar-width\s*:\s*([^;}]+)/g)) {
      const val = norm(m[1]);
      if (val !== "thin" && val !== "none") {
        v.push(`${rel}:${lineOf(src, m.index)} scrollbar-width: ${val}`);
      }
    }
  }
  report(v);
});

test("no ::-webkit-scrollbar-{thumb,track,corner,button} outside the floor", () => {
  const v = [];
  for (const { rel, src } of FILES) {
    if (rel === FLOOR) continue;
    for (const m of src.matchAll(/::-webkit-scrollbar-(thumb|track|corner|button)\b/g)) {
      v.push(`${rel}:${lineOf(src, m.index)} ::-webkit-scrollbar-${m[1]}`);
    }
  }
  report(v);
});

const HIDE_DECL = /^(display\s*:\s*none|width\s*:\s*0(px)?|height\s*:\s*0(px)?)$/;
const webkitBlocks = (src) =>
  [...src.matchAll(/::-webkit-scrollbar(?![-\w)])[^{;}]*\{/g)].map((m) => ({
    idx: m.index,
    open: m.index + m[0].length - 1,
  }));

test("::-webkit-scrollbar blocks outside the floor only hide", () => {
  const v = [];
  for (const { rel, src } of FILES) {
    if (rel === FLOOR) continue;
    for (const { idx, open } of webkitBlocks(src)) {
      const decls = ownBody(blockAt(src, open))
        .split(";")
        .map((d) => norm(d.replace(/!important/, "")))
        .filter(Boolean);
      const bad = decls.filter((d) => !HIDE_DECL.test(d));
      if (bad.length || !decls.length) {
        v.push(`${rel}:${lineOf(src, idx)} ::-webkit-scrollbar { ${bad.join("; ") || "(empty)"} }`);
      }
    }
  }
  report(v);
});

// Every webkit-only hide in `src`: a ::-webkit-scrollbar block that hides the
// bar (display:none or a zero width/height) while the rule that owns it does
// not also say scrollbar-width: none. Each selector in a list is checked on its
// own. A bare `&::-webkit-scrollbar` is owned by the enclosing rule and a flat
// `.x::-webkit-scrollbar` by the sibling `.x { }` rules; a compound `&`
// selector (`&__list::…`, `& .b::…`) cannot be resolved here, so it is
// reported rather than passed.
const isHide = (body) => {
  const decls = ownBody(body)
    .split(";")
    .map((d) => norm(d.replace(/!important/, "")))
    .filter(Boolean);
  return decls.length > 0 && decls.every((d) => HIDE_DECL.test(d));
};

function webkitOnlyHides(src) {
  const out = [];
  for (const m of src.matchAll(/[^{};]*::-webkit-scrollbar(?![-\w)])[^{;}]*\{/g)) {
    const open = m.index + m[0].length - 1;
    if (!isHide(blockAt(src, open))) continue;
    const line = lineOf(src, m.index + m[0].search(/\S/));
    for (const part of m[0].slice(0, -1).split(",")) {
      if (!/::-webkit-scrollbar(?![-\w])/.test(part)) continue;
      const sel = part.replace(/::-webkit-scrollbar.*$/s, "").trim();
      let owner = "";
      if (sel === "&" || sel === "") {
        const o = enclosingOpen(src, m.index + m[0].length - 1);
        if (o >= 0) owner = ownBody(blockAt(src, o));
      } else if (!sel.startsWith("&")) {
        const esc = sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        for (const r of src.matchAll(new RegExp(`(^|[}\\s;])${esc}\\s*\\{`, "g"))) {
          owner += ownBody(blockAt(src, r.index + r[0].length - 1));
        }
      }
      if (!/scrollbar-width\s*:\s*none/.test(owner)) out.push({ line, sel: sel || "&" });
    }
  }
  return out;
}

test("hide blocks also set scrollbar-width: none", () => {
  const v = [];
  for (const { rel, src } of FILES) {
    for (const h of webkitOnlyHides(src)) v.push(`${rel}:${h.line} webkit-only hide (${h.sel})`);
  }
  report(v);
});

test("webkitOnlyHides flags every webkit-only hide shape", () => {
  const flags = (scss) => webkitOnlyHides(stripComments(scss)).length > 0;
  // Clean shapes stay clean.
  assert.equal(flags(".a { scrollbar-width: none; &::-webkit-scrollbar { display: none; } }"), false);
  assert.equal(flags(".a { scrollbar-width: none; }\n.a::-webkit-scrollbar { display: none; }"), false);
  // A width/height hide is a hide too.
  assert.equal(flags(".a { &::-webkit-scrollbar { width: 0; } }"), true);
  // A compound `&` selector's owner is the child, not the enclosing rule.
  assert.equal(flags(".a { scrollbar-width: none; &__list::-webkit-scrollbar { display: none; } }"), true);
  assert.equal(flags(".a { scrollbar-width: none; & .b::-webkit-scrollbar { display: none; } }"), true);
  // Every selector in a list is checked, not only the first.
  assert.equal(
    flags(".a { scrollbar-width: none; }\n.a::-webkit-scrollbar, .b::-webkit-scrollbar { display: none; }"),
    true,
  );
});

test("floor declares the canonical pair on html *", () => {
  const { src } = FILES.find((f) => f.rel === FLOOR);
  const m = src.match(/(^|\n)html \*\s*\{([^}]*)\}/);
  assert.ok(m, "html * rule missing");
  assert.match(m[2], /scrollbar-width\s*:\s*thin\s*;/);
  const color = m[2].match(/scrollbar-color\s*:\s*([^;]+);/);
  assert.equal(color && norm(color[1]), CANON_COLOR);
});

test("--default-scrollbar-white is defined", () => {
  const { src } = FILES.find((f) => f.rel === "src/drumee/skin/vars/default.scss");
  const m = src.match(/--default-scrollbar-white\s*:\s*([^;]+);/);
  assert.equal(m && norm(m[1]), "var(--scrollbar-track, transparent)");
});
