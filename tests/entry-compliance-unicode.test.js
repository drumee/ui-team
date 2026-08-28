// `require:` on a Skeletons Entry/EntryBox/Textarea picks a row out of the
// `__compliances` table in the vendored SDK, and `checkSanity()` runs that row's
// regexp over the field value. When it fails, `commit()` returns BEFORE calling
// triggerHandlers — so the widget's service never fires and Enter appears to do
// nothing at all, with no message (the error styling in input.scss targets
// `input`, and the inline rename editor is a `textarea`).
//
// That is what broke Vietnamese rename: `any` was /^([\x20-\x7E\x80-\xFF])+$/,
// ASCII plus Latin-1 only, and it is anchored. Vietnamese diacritics outside
// Latin-1 — ă ơ ư đ and every hook/dot-below tone, U+0102–U+1EF9 — failed it, so
// one such character failed the whole value. "Tai lieu" saved and "Tài liệu" did
// not. The inline rename editor (media/interact.js `_createInput`) asks for
// `any`, which is why files, folders and workspaces were all affected.
//
// The table lives in `@drumee/ui-core`, patched in place by patch-package, so
// like contextmenu-text-entry.test.js this reads the INSTALLED copy: it only
// passes when the patch is actually applied to the thing that ships.
//
// The load-bearing property is that both classes are strict SUPERSETS of the
// ones they replace. That is what makes the change safe for every other field
// using `require: "any"` — task titles, contact fields, search boxes — so it is
// asserted here by fuzz rather than by a handful of examples.
const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync, existsSync } = require("node:fs");
const { join } = require("node:path");
const vm = require("node:vm");

const ENTRY = join(
  __dirname,
  "..",
  "node_modules/@drumee/ui-core/letc/widgets/entry/input/index.js",
);

// The table is a module-scope object literal referencing LOCALE. Evaluate just
// that literal with LOCALE stubbed, rather than requiring the widget — it
// extends LetcBox and reaches for app globals that only exist in the bundle.
function compliances() {
  assert.ok(
    existsSync(ENTRY),
    "@drumee/ui-core is not installed — run `npm ci` so postinstall applies patches/",
  );
  const src = readFileSync(ENTRY, "utf8");
  const start = src.indexOf("const __compliances");
  assert.notEqual(start, -1, "__compliances not found in the installed SDK");
  const end = src.indexOf("const _default_class", start);
  assert.notEqual(end, -1, "__compliances has no terminator in the installed SDK");

  const context = {
    LOCALE: new Proxy({}, { get: (_t, k) => String(k) }),
  };
  vm.createContext(context);
  vm.runInContext(
    `${src.slice(start, end)}\n; globalThis.__table = __compliances;`,
    context,
  );
  return context.__table;
}

// The classes the widened `any` / `text` replaced. Kept literal here on purpose:
// the superset assertion has to compare against what actually shipped before,
// not against whatever the file says today.
const LEGACY_ANY = /^([\x20-\x7E\x80-\xFF])+$/;
const LEGACY_TEXT = /([\x20-\x7E\x80-\xFF])+/;

// Names a Vietnamese user actually types. Every one of these was rejected by the
// legacy `any`; the first four are ordinary words, `Đề` is the harder case
// because it has no Latin-1 character at all and so also failed legacy `text`.
const VIETNAMESE = [
  "Tài liệu",
  "Tiếng Việt",
  "thư mục của tôi",
  "Ảnh chụp màn hình",
  "Đề",
];

// Must keep working exactly as before.
const ASCII_AND_LATIN1 = [
  "My Folder",
  "Tai lieu",
  "Báo cáo tháng 8", // á â ê ô are inside Latin-1 — these already worked
  "Résumé",
  "café",
  "report-2026_final.txt",
];

function fuzzCorpus() {
  const out = [];
  for (let c = 0; c < 0x300; c += 1) out.push(String.fromCharCode(c));
  for (let i = 0; i < 500; i += 1) {
    let s = "";
    for (let j = 0; j <= i % 9; j += 1) {
      s += String.fromCharCode((i * 7919 + j * 104729) % 0x2000);
    }
    out.push(s);
  }
  return out.concat(VIETNAMESE, ASCII_AND_LATIN1, [
    "",
    " ",
    "..",
    "a/b",
    "文件",
    "Отчёт",
    "Report 🎉",
  ]);
}

test("any accepts Vietnamese diacritics outside Latin-1", () => {
  const { any } = compliances();
  for (const name of VIETNAMESE) {
    assert.equal(LEGACY_ANY.test(name), false, `${name} should be a regression case`);
    assert.equal(any.regexp.test(name), true, `any must accept ${name}`);
  }
});

test("text accepts a name with no Latin-1 character at all", () => {
  const { text } = compliances();
  assert.equal(LEGACY_TEXT.test("Đề"), false, "Đề should be a regression case");
  assert.equal(text.regexp.test("Đề"), true, "text must accept Đề");
});

test("ASCII and Latin-1 values keep validating", () => {
  const { any, text } = compliances();
  for (const name of ASCII_AND_LATIN1) {
    assert.equal(any.regexp.test(name), true, `any must still accept ${name}`);
    assert.equal(text.regexp.test(name), true, `text must still accept ${name}`);
  }
});

// The safety property for every other consumer of these two rules.
test("any and text are strict supersets of the classes they replaced", () => {
  const { any, text } = compliances();
  const corpus = fuzzCorpus();
  for (const value of corpus) {
    if (LEGACY_ANY.test(value)) {
      assert.equal(any.regexp.test(value), true, `any narrowed on ${JSON.stringify(value)}`);
    }
    if (LEGACY_TEXT.test(value)) {
      assert.equal(text.regexp.test(value), true, `text narrowed on ${JSON.stringify(value)}`);
    }
  }
});

// `any` is the anchored rule, and callers lean on it to bounce control
// characters and the empty field. Widening the letters it accepts must not have
// widened those. (The empty case is what surfaces LOCALE.EMPTY_FILE via
// media/core.js checkSanity.)
test("any still rejects control characters and the empty value", () => {
  const { any } = compliances();
  for (const value of ["", "a\x00b", "a\nb", "a\tb", "a\x7Fb", "\x1F"]) {
    assert.equal(
      any.regexp.test(value),
      false,
      `any must still reject ${JSON.stringify(value)}`,
    );
  }
});

// Only `any` and `text` were meant to move. A widened `email` or `number` would
// be a real regression, so every other rule is pinned to the exact source that
// shipped in 1.1.50 — a stricter check than sampling values, and it also catches
// an SDK bump quietly changing a rule underneath the patch.
const UNTOUCHED = {
  email: String.raw`/(^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$)/`,
  email_or_id: String.raw`/(^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$)|(^([a-zA-Z0-9_\.\-])+$)/`,
  phone: String.raw`/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/`,
  ident: String.raw`/^([a-zA-Z0-9_\-])([a-zA-Z0-9_\.\-])([a-zA-Z0-9_\.\-])*$/`,
  folder: String.raw`/(^([ ,:a-zA-Z0-9_\.\-])+$)/`,
  hashtag: String.raw`/(^(?!^(--|\#|\!|\?))[^(\/|\&)]+$)/`,
  specials: String.raw`/[\/!~\"\'\|\^°&]+/`,
  date: String.raw`/^\d\d?\/\d\d?\/\d\d\d\d$/`,
  name: String.raw`/^([a-zA-Z0-9_\.\-\'\ xC0-\xFF])+$/`,
  string: String.raw`/\w+/`,
  dns: String.raw`/^$|^(([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]*[a-zA-Z0-9])\.)*([A-Za-z0-9]|[A-Za-z0-9][A-Za-z0-9\-]*[A-Za-z0-9])$/`,
  number: String.raw`/^-?[0-9]+$/`,
  decimal: String.raw`/^(([0-9]*(\.){0,1}[0-9]{0,2})|([0-9]+(\.){0,1}[0-9]*)|[0-9]+)$/`,
  none: String.raw`/^.+$/`,
  gender: String.raw`/^[MFX]$/`,
  answer: String.raw`/^[(yes)|(no)|(maybe)|(dontknow)]$/i`,
  password: String.raw`/^((.+){2,} *(.+){4,})|((.+){12,})$/`,
};

test("the other compliance rules are untouched", () => {
  const table = compliances();
  for (const [rule, source] of Object.entries(UNTOUCHED)) {
    assert.ok(table[rule], `${rule} missing from the installed table`);
    assert.equal(String(table[rule].regexp), source, `${rule} changed`);
  }
});
