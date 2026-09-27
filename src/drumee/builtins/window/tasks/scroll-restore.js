// Put saved scroll offsets back on rebuilt scrollers, retrying until they fit.
//
// A feed() rebuilds each scroller at scrollTop 0, and its cards reach full
// height a few frames LATER (parts of a card render asynchronously). Seen on
// stage 2026-09-23: at both old restore points — straight after feed() and
// the next frame — the column body was scrollHeight == clientHeight, so the
// browser clamped scrollTop 449.6 to 0 and the column jumped to the top.
//
// So: apply, and keep re-applying once per frame until each offset sticks,
// the deadline passes, or the caller cancels (the user started scrolling).
//
// No DOM and no `this`: everything here runs under plain node in a test.

const reached = (want, got) => !want || Math.abs(got - want) < 1;

function restoreScroll(saved, { find, raf, now, maxMs = 1500, isCancelled = () => false }) {
  const pending = (saved || []).slice();
  if (!pending.length) return;
  const start = now();
  const step = () => {
    if (isCancelled()) return;
    for (let i = pending.length - 1; i >= 0; i--) {
      const { selector, top, left } = pending[i];
      // Not mounted yet (a lazy part): keep waiting for it.
      const node = find(selector);
      if (!node) continue;
      if (top) node.scrollTop = top;
      if (left) node.scrollLeft = left;
      if (reached(top, node.scrollTop) && reached(left, node.scrollLeft)) {
        pending.splice(i, 1);
      }
    }
    if (pending.length && now() - start < maxMs && raf) raf(step);
  };
  step();
}

module.exports = { restoreScroll };
