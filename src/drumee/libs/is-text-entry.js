/**
 * Is this DOM node a text-entry element?
 *
 * Right-clicking anywhere in the app used to open the owning window's menu,
 * because `View.prototype.__handleContextmenu` (ui-core, patched) walks the
 * VIEW-parent chain to the first ancestor offering a `contextmenuSkeleton` and
 * calls `preventDefault()` there. A raw `<input>` is injected as innerHTML by
 * the Entry widget and owns no view, so its right-click was answered by the
 * folder window — costing the user cut/copy/paste on every field in the app.
 *
 * The handler consults this predicate on `e.target` and bails out before
 * `preventDefault()` when it answers true.
 *
 * Deliberately DOM-free: it reads `tagName`, `getAttribute` and
 * `isContentEditable` only, so it is exhaustively unit-testable and safe
 * against the synthetic `{pageX, pageY, target, ...}` object the media-grid
 * kebab passes straight into `el.oncontextmenu` — an object whose `target` may
 * be any element, or absent entirely.
 *
 * A view that genuinely wants its app menu on an input reclaims it with
 * `forceContextmenu` (own property or model attribute), read the same way
 * `escapeContextmenu` is.
 */

// Input types that carry no editable text. Everything else — including a
// missing, empty or unrecognised type, which HTML resolves to "text" — is
// treated as text entry, so a browser gaining a new text-ish type needs no
// change here.
const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

/**
 * @param {Element|null|undefined} el  usually `event.target`
 * @returns {boolean} true when the browser's own menu must be left alone
 */
function isTextEntry(el) {
  if (!el || typeof el !== "object") {
    return false;
  }

  // Covers a contenteditable host AND everything nested inside one: the DOM
  // reports isContentEditable true on descendants, so no parent walk is needed.
  if (el.isContentEditable === true) {
    return true;
  }

  const tag = typeof el.tagName === "string" ? el.tagName.toUpperCase() : "";

  if (tag === "TEXTAREA") {
    return true;
  }

  if (tag === "INPUT") {
    // `readonly` still counts — copy and select-all remain useful. `disabled`
    // fires no contextmenu event at all, so it never reaches this predicate.
    const raw =
      typeof el.getAttribute === "function" ? el.getAttribute("type") : null;
    const type = (raw == null ? "" : String(raw)).trim().toLowerCase();
    return !NON_TEXT_INPUT_TYPES.has(type);
  }

  return false;
}

module.exports = { isTextEntry, NON_TEXT_INPUT_TYPES };
