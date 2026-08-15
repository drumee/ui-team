// The predicate that decides whether a right-click keeps the browser's own
// cut/copy/paste menu. It runs against a raw DOM node handed over by the
// `contextmenu` event, so it must survive anything that is not an element —
// notably the synthetic `{pageX, pageY, target, ...}` object the media-grid
// kebab passes straight into `el.oncontextmenu`.
const test = require("node:test");
const assert = require("node:assert/strict");
const { isTextEntry } = require("../src/drumee/libs/is-text-entry");

// Minimal element stand-in. `isContentEditable` is a real DOM property that is
// true on every descendant of a contenteditable host, which is why the
// predicate never has to walk a parent chain.
const el = (tagName, attrs = {}) => ({
  tagName,
  isContentEditable: attrs.isContentEditable || false,
  getAttribute: (k) => (attrs[k] == null ? null : attrs[k]),
});

const input = (type) =>
  type === undefined ? el("INPUT") : el("INPUT", { type });

test("text-like input types keep the native menu", () => {
  for (const type of [
    "text",
    "search",
    "url",
    "tel",
    "email",
    "password",
    "number",
  ]) {
    assert.equal(isTextEntry(input(type)), true, `type="${type}"`);
  }
});

test("a missing type is text — HTML's own default", () => {
  assert.equal(isTextEntry(input(undefined)), true);
  assert.equal(isTextEntry(input("")), true);
});

test("an unknown type is treated as text, matching the browser", () => {
  // date/time inputs land here too; they carry a native menu of their own and
  // nothing in the app claims them.
  assert.equal(isTextEntry(input("date")), true);
  assert.equal(isTextEntry(input("wat")), true);
});

test("non-text input types keep the app menu", () => {
  for (const type of [
    "checkbox",
    "radio",
    "button",
    "submit",
    "reset",
    "file",
    "range",
    "color",
    "image",
  ]) {
    assert.equal(isTextEntry(input(type)), false, `type="${type}"`);
  }
});

test("input type matching ignores case and padding", () => {
  // Attribute values are author-controlled; the DOM normalises `type` but a
  // stand-in (or a hand-built synthetic) may not.
  assert.equal(isTextEntry(el("INPUT", { type: "CHECKBOX" })), false);
  assert.equal(isTextEntry(el("INPUT", { type: " checkbox " })), false);
  assert.equal(isTextEntry(el("input", { type: "text" })), true);
});

test("textarea is text entry", () => {
  assert.equal(isTextEntry(el("TEXTAREA")), true);
});

test("readonly still counts — copy and select-all stay useful", () => {
  assert.equal(isTextEntry(el("INPUT", { type: "text", readonly: "" })), true);
  assert.equal(isTextEntry(el("TEXTAREA", { readonly: "" })), true);
});

test("contenteditable is text entry whatever the tag", () => {
  assert.equal(isTextEntry(el("DIV", { isContentEditable: true })), true);
  assert.equal(isTextEntry(el("SPAN", { isContentEditable: true })), true);
});

test("a plain element is not text entry", () => {
  assert.equal(isTextEntry(el("DIV")), false);
  assert.equal(isTextEntry(el("SECTION")), false);
  assert.equal(isTextEntry(el("BUTTON")), false);
});

test("a missing target is not text entry — existing behaviour wins", () => {
  assert.equal(isTextEntry(null), false);
  assert.equal(isTextEntry(undefined), false);
});

test("a synthetic event object with no target is not text entry", () => {
  // What the kebab passes when it cannot find a trigger element.
  assert.equal(isTextEntry({ pageX: 10, pageY: 20 }), false);
  assert.equal(isTextEntry({}), false);
  assert.equal(isTextEntry("input"), false);
});
