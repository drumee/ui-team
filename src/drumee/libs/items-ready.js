/**
 * "My first load has painted" — a one-shot promise a screen hangs on itself.
 *
 * WHY. The desk puts the last screen back after a reload (modules/desk
 * _restoreScreen), and a screen that is mounted is not yet a screen that is
 * USEFUL: every one of them fetches its rows after it mounts. togglePanel
 * settles when a kind is fed, not drawn, so nothing outside the screen can
 * tell "empty because loading" from "empty because empty". The screen can:
 * it knows the moment its first load landed.
 *
 * RULE for callers: mark after the first load has PAINTED — rows, the empty
 * state, or the error state. A failed fetch is still "ready" (no longer
 * loading). Marking only on rows would make every genuinely empty screen time
 * out and be refreshed for nothing.
 *
 * Pure: no app globals, so tests/items-ready.test.js can require it.
 */
const KEY = "__itemsReady";

/**
 * Arm the promise. Call once from initialize(); calling again is a no-op.
 * @param {Object} widget
 * @returns {Object} the widget, now with whenItemsReady()
 */
function armItemsReady(widget) {
  if (!widget || widget[KEY]) return widget;
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  widget[KEY] = { promise, resolve, done: false };
  widget.whenItemsReady = () => widget[KEY].promise;
  return widget;
}

/**
 * Resolve it. Only the first call counts.
 * @param {Object} widget
 * @returns {Boolean} true when this call was the one that resolved it
 */
function markItemsReady(widget) {
  const st = widget && widget[KEY];
  if (!st || st.done) return false;
  st.done = true;
  st.resolve(true);
  // For tests and for reading a live page; no stylesheet keys on it.
  // Already kebab-case on the way out (itemsReady -> data-items-ready).
  if (widget.el && widget.el.dataset) widget.el.dataset.itemsReady = "1";
  return true;
}

/**
 * @param {Object} widget
 * @returns {Boolean}
 */
function isItemsReady(widget) {
  return !!(widget && widget[KEY] && widget[KEY].done);
}

module.exports = { armItemsReady, markItemsReady, isItemsReady };
