// tests/tasks-desc-format-bar.test.js — the formatting toolbar above the task
// description (create + detail): its seven buttons, what each one runs, the
// Ctrl/Cmd+Shift shortcuts every mention editor gets, and the buttons lighting
// for the formats under the caret.
//
//   node --test tests/tasks-desc-format-bar.test.js
//
// Runs the REAL formatBar (skeleton/index.js) against stub Skeletons and the
// REAL _applyFormat / _syncFormatBar / _onDescKeydown (sliced out of index.js,
// which only loads under webpack) against stubs.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { sliceFunction } = require("./helpers/slice-method");

const ROOT = path.join(__dirname, "..");
const TASKS = "src/drumee/builtins/window/tasks";
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const INDEX_SRC = read(`${TASKS}/index.js`);
const SKEL_SRC = read(`${TASKS}/skeleton/index.js`);

// A top-level `function name(...) {` … `\n}` out of a source file.
function sliceTop(src, sig) {
  const start = src.indexOf(`\nfunction ${sig} {`);
  if (start < 0) throw new Error(`${sig} not found`);
  return src.slice(start, src.indexOf("\n}\n", start) + 2).trim();
}
// `const NAME = {...};` out of a source file, evaluated.
function constOf(src, name) {
  const m = src.match(new RegExp(`\\nconst ${name} = (\\{[\\s\\S]*?\\});`));
  if (!m) throw new Error(`${name} not found`);
  return new Function(`return ${m[1]}`)();
}
const FORMAT_COMMANDS = constOf(INDEX_SRC, "FORMAT_COMMANDS");
const SHIFT_FORMAT_KEYS = constOf(INDEX_SRC, "SHIFT_FORMAT_KEYS");

const KEYS = ["FORMAT_BOLD", "FORMAT_ITALIC", "FORMAT_UNDERLINE", "FORMAT_STRIKE", "FORMAT_BULLET_LIST", "FORMAT_NUMBERED_LIST", "FORMAT_LINK"];
const LOCALE = Object.fromEntries(KEYS.map((k) => [k, k.toLowerCase()]));
const Skeletons = {
  Box: { X: (o) => ({ t: "X", ...o }), Y: (o) => ({ t: "Y", ...o }) },
  Note: (o) => ({ t: "Note", ...o }),
};
const formatBar = new Function("Skeletons", "LOCALE", `return ${sliceTop(SKEL_SRC, "formatBar(ui, scope)")}`)(Skeletons, LOCALE);

const method = (sig) =>
  new Function("FORMAT_COMMANDS", "SHIFT_FORMAT_KEYS", "COMMENT_SUBMIT_BY_SCOPE", `return ${sliceFunction(INDEX_SRC, sig)}`)(
    FORMAT_COMMANDS,
    SHIFT_FORMAT_KEYS,
    {},
  );

test("the bar has the seven buttons in order, only on description editors", () => {
  const bar = formatBar({ fig: { family: "tasks-panel" } }, "detail");
  const buttons = bar.kids.filter((k) => k.service);
  assert.deepEqual(buttons.map((k) => k.attrOpt["data-format"]), ["bold", "italic", "underline", "strike", "ul", "ol", "link"]);
  assert.deepEqual(buttons.map((k) => k.format), ["bold", "italic", "underline", "strike", "ul", "ol", "link"]);
  assert.ok(buttons.every((k) => k.service === "desc-format" && k.formatScope === "detail"));
  assert.equal(buttons[0].attrOpt.title, "format_bold");
  assert.equal(bar.kids.filter((k) => /__format-sep/.test(k.className)).length, 2);
  assert.equal(bar.sys_pn, "detail-format-bar");
  assert.match(SKEL_SRC, /mentionField\(ui, scope, scope === "detail" && quickLocked \? \{ readOnly: true \} : \{ formatBar: true \}\)/);
  assert.match(sliceTop(SKEL_SRC, "mentionField(ui, scope, opt = {})"), /opt\.formatBar && !opt\.readOnly \? \[formatBar\(ui, scope\)\] : \[\]/);
});

function applyUi({ editable = true } = {}) {
  const log = { calls: [], saved: [], prompts: [], focused: 0 };
  global.document = { execCommand: (...a) => log.calls.push(a) };
  const editor = { getAttribute: () => (editable ? "true" : "false"), focus: () => log.focused++ };
  const ui = {
    el: { querySelector: () => editor },
    _mentionTarget: () => ({ editorSelector: ".ed" }),
    _onDescInput: (scope) => log.saved.push(scope),
    _syncFormatBar: () => {},
    _openLinkPrompt: (scope) => log.prompts.push(scope),
    _applyFormat: method("_applyFormat(scope, format)"),
  };
  return { ui, log };
}

test("a button runs its command with CSS styling off, then saves", () => {
  const { ui, log } = applyUi();
  ui._applyFormat("detail", "strike");
  assert.deepEqual(log.calls, [["styleWithCSS", false, false], ["strikeThrough"]]);
  assert.deepEqual(log.saved, ["detail"]);
  assert.equal(log.focused, 1);
});

test("link opens the link prompt instead of a command", () => {
  const { ui, log } = applyUi();
  ui._applyFormat("create", "link");
  assert.deepEqual(log.prompts, ["create"]);
  assert.deepEqual(log.calls, []);
});

test("a read-only description is never formatted", () => {
  const { ui, log } = applyUi({ editable: false });
  ui._applyFormat("detail", "bold");
  assert.deepEqual(log.calls, []);
  assert.deepEqual(log.saved, []);
});

test("Ctrl+Shift+8 / 7 / X format, matched on code", () => {
  const applied = [];
  const ui = {
    _applyFormat: (scope, f) => applied.push(`${scope}:${f}`),
    _onDescKeydown: method("_onDescKeydown(e, scope)"),
  };
  for (const [code, f] of [["Digit8", "ul"], ["Digit7", "ol"], ["KeyX", "strike"]]) {
    for (const mod of [{ ctrlKey: true }, { metaKey: true }]) {
      const e = { ...mod, shiftKey: true, code, key: "*", preventDefault() { this.done = 1; } };
      ui._onDescKeydown(e, "comment");
      assert.equal(e.done, 1, code);
      assert.equal(applied.pop(), `comment:${f}`);
    }
  }
});

test("buttons light for the formats under the caret", () => {
  const btn = (format) => ({ dataset: { format } });
  const buttons = ["bold", "italic", "ul", "link"].map(btn);
  buttons[1].dataset.active = "1"; // stale from an earlier selection
  const editor = { contains: () => true };
  const anchor = { nodeType: 3, parentElement: { closest: () => null } };
  const bar = {
    closest: () => ({ querySelector: () => editor }),
    querySelectorAll: () => buttons,
  };
  global.window = { getSelection: () => ({ rangeCount: 1, anchorNode: anchor }) };
  global.document = { queryCommandState: (c) => c === "bold" || c === "insertUnorderedList" };
  const ui = {
    fig: { family: "tasks-panel" },
    el: { querySelectorAll: () => [bar] },
    _syncFormatBar: method("_syncFormatBar()"),
  };
  ui._syncFormatBar();
  assert.deepEqual(buttons.map((b) => b.dataset.active || ""), ["1", "", "1", ""]);
});

test("every label exists in every locale", () => {
  for (const lang of ["en", "fr", "es", "ru", "km", "zh"]) {
    const loc = JSON.parse(read(`locale/${lang}.json`));
    for (const k of KEYS) assert.ok(loc[k], `${lang}.${k}`);
  }
});
