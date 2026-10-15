/**
 * Stamp the export dialog's date row data-ready="1" once every date field's
 * flatpickr picker has mounted. Until then the skin shows a loading state
 * (skin: &__date-row:not([data-ready="1"])).
 *
 * The fields are `date_picker` — a lazy kind that also imports flatpickr in
 * its own onDomRefresh — so the row renders with empty fields for a moment
 * after "Date range" is switched on. A positive stamp on the (non-lazy) row,
 * not a CSS guess at the lazy child's emptiness: flatpickr marks each input
 * it takes over with `.flatpickr-input`, one per picker at least.
 *
 * Fail-safe: released after `timeout` even if a picker never mounts, so the
 * row can never spin forever.
 */
const WRAP = ".widget-chat-export__date-input-wrap";
const PICKED = ".flatpickr-input";

function watchDateRowReady(el, opt = {}) {
  if (!el || !el.dataset) return;
  const MO =
    opt.MutationObserver ||
    (typeof MutationObserver !== "undefined" ? MutationObserver : null);
  const timeout = opt.timeout == null ? 10000 : opt.timeout;

  // Fields must exist first: onPartReady fires before the row's kids render,
  // and "0 pickers for 0 fields" used to read as ready — the stamp went on too
  // early and the row then stuck on loading.
  const isReady = () => {
    const fields = el.querySelectorAll(WRAP).length;
    return fields > 0 && el.querySelectorAll(PICKED).length >= fields;
  };

  if (isReady() || !MO) {
    el.dataset.ready = "1";
    return;
  }
  // No "0" written here: the skin reads a MISSING stamp as loading, and the
  // row carries no model dataset that render could write back over "1".
  delete el.dataset.ready;

  let timer = null;
  const observer = new MO(() => {
    if (isReady()) done();
  });
  function done() {
    observer.disconnect();
    if (timer) clearTimeout(timer);
    timer = null;
    el.dataset.ready = "1";
  }
  observer.observe(el, { childList: true, subtree: true });
  timer = setTimeout(done, timeout);
}

module.exports = { watchDateRowReady };
