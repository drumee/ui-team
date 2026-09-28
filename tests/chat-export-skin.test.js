// chat-export-skin.test.js — the chat export dialog (widget-chat-export),
// opened from Chat details' Download tile and the file menu's "Download Chat
// Threads". Pins the two requested changes: the header stays fixed while the
// card scrolls, and every item is downsized (~80% of the original Figma sizes).
//
//   node --test tests/chat-export-skin.test.js
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const sass = require("sass");

const SRC = path.join(__dirname, "..", "src/drumee");
const css = sass
  .compile(path.join(SRC, "builtins/widget/chat-export/skin/index.scss"), {
    loadPaths: [SRC, path.join(SRC, "skin")],
    logger: sass.Logger.silent,
  })
  .css.replace(/\s+/g, " ");

const rule = (sel) => {
  const m = css.match(new RegExp(sel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + " \\{([^}]*)\\}"));
  assert.ok(m, `missing rule ${sel}`);
  return m[1];
};
const P = ".widget-chat-export";

test("header stays fixed at the top of the scrolling card", () => {
  const card = rule(`${P}__card`);
  assert.match(card, /overflow-y: auto/);
  assert.match(card, /padding: 24px/);
  const h = rule(`${P}__header`);
  assert.match(h, /position: sticky/);
  // -24px cancels the card padding: sticky otherwise clamps inside it and the
  // scrolled content shows through the strip above the header.
  assert.match(h, /top: -24px/);
  assert.match(h, /z-index: 2/);
  assert.match(h, /margin: -24px -24px -12px/);
  assert.match(h, /padding: 24px 24px 12px/);
  assert.match(h, /background: #ffffff/);
  assert.match(h, /border-radius: 16px 16px 0 0/);
});

test("card and header are downsized", () => {
  const card = rule(`${P}__card`);
  assert.match(card, /width: 440px/);
  assert.match(card, /border-radius: 16px/);
  assert.match(card, /gap: 16px/);
  assert.match(rule(`${P}__header-ico`), /width: 24px; height: 24px/);
  assert.match(rule(`${P}__header-title`), /font-size: 18px;.*line-height: 24px/);
  assert.match(rule(`${P}__header-close`), /width: 28px; height: 28px; padding: 7px/);
});

test("every item is downsized", () => {
  assert.match(rule(`${P}__folder-icon-box`), /width: 32px; height: 32px/);
  assert.match(rule(`${P}__folder-icon`), /width: 18px; height: 18px/);
  assert.match(rule(`${P}__folder-name`), /font-size: 14px;.*line-height: 20px/);
  assert.match(rule(`${P}__folder-meta-text`), /font-size: 12px;.*line-height: 16px/);
  assert.match(rule(`${P}__section-label`), /font-size: 14px;.*line-height: 20px/);
  assert.match(rule(`${P}__format-icon-box`), /width: 28px; height: 28px/);
  assert.match(rule(`${P}__format-title`), /font-size: 14px;.*line-height: 20px/);
  assert.match(rule(`${P}__format-subtitle`), /font-size: 12px;.*line-height: 16px/);
  assert.match(rule(`${P}__scope-row`), /padding: 8px 12px/);
  assert.match(rule(`${P}__checkbox`), /width: 16px; height: 16px/);
  assert.match(rule(`${P}__scope-label`), /font-size: 13px;.*line-height: 18px/);
  assert.match(rule(`${P}__date-switch`), /width: 34px; height: 18px/);
  assert.match(rule(`${P}__date-input-wrap`), /padding: 6px 8px/);
  assert.match(rule(`${P}__date-input-wrap ${P}__date-input`), /font-size: 13px;.*line-height: 18px/);
  assert.match(rule(`${P}__footer-hint`), /font-size: 12px;.*line-height: 16px/);
  assert.match(rule(`${P}__download-btn`), /padding: 10px 20px/);
  assert.match(rule(`${P}__download-btn-label`), /font-size: 14px;.*line-height: 20px/);
});

// flatpickr picker inside the wrap (widget/datepicker): its field sits flush in
// the wrap — the datepicker skin's own boxed input (.datepicker input: border,
// 36px, padding) is overridden — and no native date-picker CSS is left.
test("date fields are flatpickr pickers styled flush inside the wrap", () => {
  const input = rule(`${P}__date-input-wrap ${P}__date-input`);
  assert.match(input, /border: none/);
  assert.match(input, /height: auto/);
  assert.match(input, /padding: 0/);
  assert.match(input, /background: transparent/);
  assert.match(rule(`${P}__date-picker`), /flex: 1; min-width: 0/);
  assert.doesNotMatch(css, /calendar-picker-indicator/);
});
