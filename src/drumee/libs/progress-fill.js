/**
 * A view re-fed on every change gets a new progress fill each time, so the
 * fill's CSS width transition never runs and the bar jumps from one value to
 * the next. Start the new fill where the previous one stood and let the
 * transition carry it to its own width.
 *
 * Call right after feed(). `memo` is an object the caller keeps between
 * renders; it remembers the last width, and is cleared when no fill is shown
 * so the next run starts from its own first value.
 */
function animateFill(root, selector, memo) {
  const el = root && root.querySelector && root.querySelector(selector);
  if (!el) {
    memo.width = null;
    return;
  }
  const to = el.style.width;
  const from = memo.width;
  memo.width = to;
  if (!from || !to || from === to) return;
  el.style.transition = 'none';
  el.style.width = from;
  // Commit the start width, or the browser folds both writes into one.
  void el.offsetWidth;
  el.style.transition = '';
  el.style.width = to;
}

module.exports = { animateFill };
