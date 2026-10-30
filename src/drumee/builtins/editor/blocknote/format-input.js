// ===========================================================
//  Notion-style Note — formatting asked for by the BROWSER.
// ===========================================================

/**
 * Bold / Italic / Underline / Strikethrough that come from outside the
 * editor's own toolbar and shortcuts: Safari's right-click menu on macOS
 * (Font ▸ Bold, Italic, Underline) and the iPhone/iPad selection menu
 * (Format ▸ B I U). The editor leaves right-clicks to the browser
 * (state.js), so these are what a user reaches for there.
 *
 * WebKit announces each as a cancelable `beforeinput` with a `format*`
 * inputType, then edits the DOM itself. ProseMirror, under BlockNote, acts on
 * none of these input types, so the change was left to the browser's DOM
 * edit — and in the note it did not take. Answering the event here, through
 * BlockNote's own style API, makes the result the same as the toolbar's,
 * whatever the browser would have written.
 *
 * Several styles picked one after another each arrive as their own event and
 * each toggles its own style, so they combine.
 */
const FORMAT_STYLES = {
  formatBold: "bold",
  formatItalic: "italic",
  formatUnderline: "underline",
  formatStrikeThrough: "strike",
};

/**
 * @param {Object} editor the BlockNote editor
 * @param {InputEvent} e  a `beforeinput` event
 * @returns {Boolean} whether the event was a format request and was applied
 */
function applyFormatInput(editor, e) {
  const style = e && FORMAT_STYLES[e.inputType];
  if (!style || !editor || typeof editor.toggleStyles !== "function") return false;
  e.preventDefault();
  editor.toggleStyles({ [style]: true });
  return true;
}

module.exports = { FORMAT_STYLES, applyFormatInput };
