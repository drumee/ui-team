// A URL linked to itself survives a save + reopen (tester, 2026-11-02).
//
// Paste https://github.com/drumee/ui-team/pull/825 into a task description,
// Ctrl+K it to the same URL, Update, close, reopen: the link was gone — plain
// text, no underline, not clickable. fromDom stored a link whose label equals
// its URL as bare text, and the editor (rightly) never auto-links bare text,
// so on reopen there was nothing left to draw as a link.
const test = require("node:test");
const assert = require("node:assert");
const { resolve } = require("node:path");
const { el, document, shape } = require("./helpers/fake-dom");

const DIR = resolve(__dirname, "../src/drumee/builtins/window/tasks");
const { parse, stringify, fromDom, toDom, toPlain } = require(resolve(DIR, "rich-text.js"));
const { safeUrl } = require(resolve(DIR, "mention-markers.js"));

const URL = "https://github.com/drumee/ui-team/pull/825";
const OPT = { chipClass: "chip", imgClass: "img", safeUrl };
// The editor's makers (_richMakers(true)): links drawn as <a>, text left alone.
const MAKERS = {
  link: (label, url) => {
    const a = el("a", [label]);
    a.dataset.href = url;
    return a;
  },
  text: (s) => [document.createTextNode(s)],
  mention: () => el("span"),
  img: () => el("img"),
};

// What _makeLinkNode leaves in the editor.
function linkNode(label, href) {
  const a = el("a", [label], { attrs: { href } });
  a.dataset.href = href;
  return a;
}

test("a link whose text is its URL is saved as a link", () => {
  const editor = el("div", ["See ", linkNode(URL, URL), " "]);
  const saved = stringify(fromDom(editor, OPT));
  assert.strictEqual(saved, `See [${URL}](link:${URL}) `);
});

test("...and is drawn as a link again when the task reopens", () => {
  const editor = el("div", [linkNode(URL, URL)]);
  const saved = stringify(fromDom(editor, OPT));
  const reopened = el("div");
  reopened.appendChild(toDom(parse(saved), document, MAKERS));
  assert.deepStrictEqual(shape(reopened), [{ a: [URL] }]);
  assert.strictEqual(reopened.childNodes[0].dataset.href, URL);
});

test("a bare URL that was never linked stays plain text", () => {
  const editor = el("div", [`See ${URL}`]);
  assert.strictEqual(stringify(fromDom(editor, OPT)), `See ${URL}`);
});

test("card previews show the URL, not the marker", () => {
  assert.strictEqual(toPlain(`See [${URL}](link:${URL})`), `See ${URL}`);
});
