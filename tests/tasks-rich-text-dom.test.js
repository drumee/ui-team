// tests/tasks-rich-text-dom.test.js — the editor DOM <-> stored text bridge of
// the tasks panel (rich-text.js fromDom / toDom): the tags execCommand makes
// become marks, lists become "- " / "N. " lines, and what toDom draws reads
// back as exactly the text it was drawn from.
//
//   node --test tests/tasks-rich-text-dom.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { el, document, shape } = require("./helpers/fake-dom");

const DIR = path.join(__dirname, "../src/drumee/builtins/window/tasks");
const R = require(path.join(DIR, "rich-text.js"));

const opt = {
  chipClass: "tasks-panel__mention-chip",
  imgClass: "tasks-panel__inline-img",
  safeUrl: (u) => (/^https?:/.test(u || "") ? u : null),
};
const makers = {
  mention: (name, uid) => el("span", [`@${name}`], { className: opt.chipClass, dataset: { uid, name } }),
  img: (nid, hub, width) =>
    el("span", [], { className: opt.imgClass, dataset: { nid, hub: hub || "" }, style: { width: width ? `${width}px` : "" } }),
  link: (label, url) => el("a", [label], { dataset: { href: url } }),
  text: (s) => [document.createTextNode(s)],
};
const ser = (root) => R.stringify(R.fromDom(root, opt));
const wrap = (frag) => {
  const d = el("div");
  d.appendChild(frag);
  return d;
};

test("execCommand's tags serialise", () => {
  assert.equal(
    ser(el("div", ["a ", el("b", ["b"]), " ", el("i", ["c"]), el("u", ["d"]), el("s", ["e"])])),
    "a **b** _c_++d++~~e~~",
  );
  assert.equal(ser(el("div", [el("strong", ["x"]), " ", el("em", ["y"]), el("strike", ["z"])])), "**x** _y_~~z~~");
});

test("style-only weight and decoration count", () => {
  assert.equal(ser(el("div", [el("span", ["x"], { style: { fontWeight: "700" } })])), "**x**");
  assert.equal(
    ser(el("div", [el("span", ["x"], { style: { textDecorationLine: "underline line-through" } })])),
    "++~~x~~++",
  );
});

test("fromDom: a normal weight cancels an outer <b>", () => {
  assert.equal(
    ser(
      el("div", [
        el(
          "b",
          [el("span", ["plain "], { style: { fontWeight: "normal" } }), el("span", ["bold"], { style: { fontWeight: "700" } })],
          { style: { fontWeight: "normal" } },
        ),
      ]),
    ),
    "plain **bold**",
  );
});

test("adjacent runs of one mark merge", () => {
  assert.equal(ser(el("div", [el("b", ["a"]), el("b", ["b"])])), "**ab**");
});

test("italic inside a word is dropped, never stored as literal underscores", () => {
  assert.equal(ser(el("div", ["un", el("i", ["believ"]), "able"])), "unbelievable");
  assert.equal(ser(el("div", ["an ", el("i", ["idea"]), "."])), "an _idea_.");
});

test("a bold run inside a list item", () => {
  assert.equal(
    ser(el("div", [el("ul", [el("li", ["a ", el("b", ["b"])]), el("li", ["c"])]), "after"])),
    "- a **b**\n- c\nafter",
  );
});

test("nested lists flatten", () => {
  assert.equal(ser(el("div", [el("ol", [el("li", ["a", el("ol", [el("li", ["b"])])])])])), "1. a\n2. b");
});

test("Chrome's Enter (<div>) and placeholder <br> make lines", () => {
  assert.equal(ser(el("div", ["x", el("div", ["y"]), el("div", [el("br")])])), "x\ny\n");
  assert.equal(ser(el("div", [el("br")])), "");
});

test("atoms: chips, images and links", () => {
  assert.equal(
    ser(el("div", [makers.mention("Ann", "7"), " ", makers.img("5", "h", 120), makers.link("doc", "https://a.b")])),
    "[@Ann](user:7) ![img](file:5@h|120)[doc](link:https://a.b)",
  );
  // A link that reads as its own target, and one whose scheme is refused.
  assert.equal(ser(el("div", [makers.link("https://a.b", "https://a.b"), " ", makers.link("x", "javascript:1")])), "https://a.b x");
});

test("toDom draws marks, lists and atoms", () => {
  const frag = R.toDom(R.parse("**a** [@Ann](user:7)\n- x"), document, makers);
  assert.deepEqual(shape(wrap(frag)), [{ b: ["a"] }, " ", { span: ["@Ann"] }, { ul: [{ li: ["x"] }] }]);
});

test("toDom → fromDom → stringify is the identity", () => {
  for (const s of [
    "a **b** _c_ ++d++ ~~e~~",
    "**_x_ [@Ann](user:7)**",
    "- a\n- **b**\n1. c\nd",
    "2\\*3 a\\_b",
    "\\- not a list",
    "x\n\ny",
    "x\n",
    "\nx",
    "x\n\n- a\n\ny",
    "- \n- b",
  ])
    assert.equal(ser(wrap(R.toDom(R.parse(s), document, makers))), s, JSON.stringify(s));
});
