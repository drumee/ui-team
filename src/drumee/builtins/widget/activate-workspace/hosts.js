/**
 * Releasing a shared popup host.
 *
 * The flow hands the user to surfaces it does not own — Wm's `wrapper-modal`
 * and the desk's `overlay`. Both are full-viewport elements that are inert
 * until something marks them `data-state="open"`, at which point they take a
 * dim and `pointer-events: auto`.
 *
 * Emptying one is not the same as closing it. A host left with its content
 * gone and `data-state="open"` still set is an invisible blocker over the whole
 * desk: the popup is gone, the screen is greyed, and nothing is clickable.
 * That is the shape of the bug reported after the tutorial, where this flow
 * mounts on the tour's destroy and the two teardowns overlap.
 *
 * The decision lives here, alone and pure, because it is the part worth being
 * sure about; the rest is DOM plumbing that needs a browser.
 */

/**
 * Should this host be closed?
 *
 * "Open AND empty", deliberately, rather than any notion of ownership: an empty
 * open host is an orphan whoever left it there, while a host with content
 * belongs to someone still using it and must not be touched. That makes the
 * check safe to run unconditionally on any teardown path, with no risk of
 * taking down a live modal.
 *
 * @param {Element} el
 * @returns {Boolean}
 */
function isOrphanHost(el) {
  if (!el || !el.dataset) return false;
  if (el.dataset.state !== "open") return false;
  // The DOM's own count, not a view's collection: this flow portals its root to
  // document.body, so a host can still hold a child in Marionette while being
  // visually empty.
  return !el.childElementCount;
}

/**
 * Close it if it is an orphan. No-op otherwise.
 *
 * @param {Element} el
 * @returns {Boolean} whether it was closed
 */
function releaseIfEmpty(el) {
  if (!isOrphanHost(el)) return false;
  el.dataset.state = "closed";
  delete el.dataset.overlay;
  delete el.dataset.guidedOverlay;
  return true;
}

module.exports = { isOrphanHost, releaseIfEmpty };
