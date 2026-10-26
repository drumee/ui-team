// tests/tasks-rich-text-grammar.test.js — the stored grammar of task
// descriptions and comments (window/tasks/rich-text.js): **bold**, _italic_,
// ++underline++, ~~strike~~, "- " / "N. " list lines, backslash escapes, on
// top of the existing mention / image / link markers.
//
//   node --test tests/tasks-rich-text-grammar.test.js
//
// QA (2026-10-26): Ctrl+B in __desc-editor looked bold, Update saved, and the
// reopened task showed plain text — the stored form had no way to say "bold".
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/tasks");
const R = require(path.join(DIR, "rich-text.js"));
const B = (...kids) => ({ t: "mark", m: "b", kids });
const T = (v) => ({ t: "text", v });

test("each mark parses", () => {
  assert.deepEqual(R.parse("a **b** c"), [{ t: "line", kids: [T("a "), B(T("b")), T(" c")] }]);
  for (const [s, m] of [["_x_", "i"], ["++x++", "u"], ["~~x~~", "s"]])
    assert.deepEqual(R.parse(s)[0].kids, [{ t: "mark", m, kids: [T("x")] }], s);
});

test("marks nest", () => {
  assert.deepEqual(R.parse("**_x_**")[0].kids, [B({ t: "mark", m: "i", kids: [T("x")] })]);
});

test("marks wrap atoms", () => {
  assert.deepEqual(R.parse("**hi [@Ann](user:7)**")[0].kids, [
    B(T("hi "), { t: "mention", name: "Ann", uid: "7" }),
  ]);
});

test("lists", () => {
  assert.deepEqual(R.parse("- a\n- **b**\n1. c\nd"), [
    { t: "ul", items: [[T("a")], [B(T("b"))]] },
    { t: "ol", items: [[T("c")]] },
    { t: "line", kids: [T("d")] },
  ]);
});

test("legacy text parses to itself", () => {
  for (const s of ["C++ rocks", "2*3=6", "foo_bar_baz", "a ~ b", "C:\\temp", "** x", "_open"])
    assert.equal(R.toPlain(s), s, s);
});

test("stringify escapes what parse would read as markup", () => {
  const blocks = [
    { t: "line", kids: [T("2*3 a_b ++ ~~ \\ ")] },
    { t: "line", kids: [T("- not a list")] },
    { t: "line", kids: [T("3. nor this")] },
  ];
  const s = R.stringify(blocks);
  assert.equal(s, "2\\*3 a\\_b \\+\\+ \\~\\~ \\\\ \n\\- not a list\n3\\. nor this");
  assert.deepEqual(R.parse(s), blocks);
});

test("stringify(parse(s)) is the identity on stringify output", () => {
  for (const s of [
    "a **b** _c_ ++d++ ~~e~~",
    "**hi [@Ann](user:7)**",
    "- a\n- b\n1. c\n2. d",
    "![img](file:5@h|120)",
    "[x](link:https://a.b)",
    "",
  ])
    assert.equal(R.stringify(R.parse(s)), s, s);
});

test("previews and the list-edit guard", () => {
  assert.equal(
    R.toPlain("**Fix** [@Ann](user:7) [doc](link:https://a.b) ![img](file:5)"),
    "Fix @Ann doc 🖼",
  );
  assert.equal(R.hasRichContent("plain C++"), false);
  assert.equal(R.hasRichContent("**x**"), true);
  assert.equal(R.hasRichContent("- x"), true);
});
