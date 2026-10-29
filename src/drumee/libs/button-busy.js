/**
 * A modal footer's action button, busy while its write is in flight.
 *
 * The button wears `data-loading="1"` (and aria-busy) — the skin swaps its
 * label for a spinner — and its footer wears `data-busy="1"`, so the sibling
 * actions stand down until the write answers. A second press on a busy button
 * is dropped, which also keeps a double click from writing twice. Used by the
 * Personal Calendar's modal foot and a folder's meeting modal footer; Cancel
 * never goes through here.
 *
 * Stamped straight on the elements: the footer is not re-fed for this, and a
 * modal that closes on success takes its button with it — clearing a detached
 * element is harmless.
 *
 * Pure: no app globals, so tests/button-busy.test.js can require it.
 */

/**
 * @param {HTMLElement|null} el  the pressed button (cmd.el)
 * @param {Function} run         the action; may return a promise
 * @returns {Promise<*>} what `run` returned, or undefined when dropped
 */
async function withButtonBusy(el, run) {
  if (!el || !el.dataset) return run();
  if (el.dataset.loading === "1") return undefined;
  const foot = el.parentElement || null;
  el.dataset.loading = "1";
  el.setAttribute("aria-busy", "true");
  if (foot && foot.dataset) foot.dataset.busy = "1";
  try {
    return await run();
  } finally {
    delete el.dataset.loading;
    el.removeAttribute("aria-busy");
    if (foot && foot.dataset) delete foot.dataset.busy;
  }
}

module.exports = { withButtonBusy };
