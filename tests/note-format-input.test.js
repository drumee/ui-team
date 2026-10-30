// Right-click ▸ Italic / Underline formats the selected text (tester, 2026-10-30).
//
// The note leaves right-clicks to the browser's own menu (state.js). Safari's
// menu on macOS (Font ▸ Bold, Italic, Underline) and the iPhone/iPad
// selection menu (Format ▸ B I U) ask for formatting with a cancelable
// `beforeinput` carrying a `format*` inputType. ProseMirror acts on none of
// them, so the note now answers them itself through BlockNote's style API.
const test = require("node:test");
const assert = require("node:assert");
const { readFileSync } = require("node:fs");
const { resolve } = require("node:path");

const ROOT = resolve(__dirname, "..");
const DIR = resolve(ROOT, "src/drumee/builtins/editor/blocknote");
const { applyFormatInput, FORMAT_STYLES } = require(resolve(DIR, "format-input.js"));

// A BlockNote editor that records which styles were toggled.
function fakeEditor() {
  const styles = {};
  return {
    styles,
    toggleStyles(s) {
      for (const k of Object.keys(s)) styles[k] = !styles[k];
    },
  };
}

function beforeinput(inputType) {
  return { inputType, prevented: 0, preventDefault() { this.prevented++; } };
}

test("each menu entry maps to the editor's own style", () => {
  assert.deepStrictEqual(FORMAT_STYLES, {
    formatBold: "bold",
    formatItalic: "italic",
    formatUnderline: "underline",
    formatStrikeThrough: "strike",
  });
});

test("Italic then Underline both apply, and stay applied together", () => {
  const ed = fakeEditor();
  const a = beforeinput("formatItalic");
  const b = beforeinput("formatUnderline");
  assert.strictEqual(applyFormatInput(ed, a), true);
  assert.strictEqual(applyFormatInput(ed, b), true);
  assert.deepStrictEqual(ed.styles, { italic: true, underline: true });
  // The browser's own DOM edit is cancelled: BlockNote wrote the change.
  assert.strictEqual(a.prevented, 1);
  assert.strictEqual(b.prevented, 1);
});

test("Bold and Strikethrough too, and picking one again removes it", () => {
  const ed = fakeEditor();
  applyFormatInput(ed, beforeinput("formatBold"));
  applyFormatInput(ed, beforeinput("formatStrikeThrough"));
  assert.deepStrictEqual(ed.styles, { bold: true, strike: true });
  applyFormatInput(ed, beforeinput("formatBold"));
  assert.deepStrictEqual(ed.styles, { bold: false, strike: true });
});

test("typing, deleting, pasting and undo are left alone", () => {
  const ed = fakeEditor();
  for (const t of ["insertText", "deleteContentBackward", "insertFromPaste", "historyUndo", "formatFontName", undefined]) {
    const e = beforeinput(t);
    assert.strictEqual(applyFormatInput(ed, e), false, String(t));
    assert.strictEqual(e.prevented, 0, String(t));
  }
  assert.deepStrictEqual(ed.styles, {});
  assert.strictEqual(applyFormatInput(null, beforeinput("formatBold")), false);
});

test("the editor listens in CAPTURE, and only while the note is editable", () => {
  const src = readFileSync(resolve(DIR, "state.js"), "utf8");
  assert.match(src, /require\("\.\/format-input"\)/);
  const at = src.indexOf('addEventListener(\n      "beforeinput"');
  assert.ok(at > 0, "a beforeinput listener is attached to the editor element");
  const call = src.slice(at, at + 300);
  assert.match(call, /this\._editable && this\._editor\) applyFormatInput\(this\._editor, e\)/);
  assert.match(call, /\},\s*true\s*\)/);
});
