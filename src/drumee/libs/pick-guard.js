/**
 * Keep a suggestion list alive through a SLOW click.
 *
 * Every picker in the app hides its dropdown on a DEFERRED `focusout` (200 ms),
 * because pressing a row blurs the search input before the click can land. That
 * deferral is a race against how long the user holds the button down, and the
 * user wins it often: a deliberate press easily passes 200 ms, the row is torn
 * out of the DOM while the button is still down, `mouseup` then lands on
 * whatever sits underneath — and the browser only emits `click` when mousedown
 * and mouseup share a target, so NO click is dispatched at all. The pick
 * silently does nothing and the list closes. Measured on a real picker: a
 * 213 ms press against the 200 ms timer, `click` never fired.
 *
 * That is why these lists "only work on a double click": a double click is made
 * of two short presses, and a short press beats the timer.
 *
 * This removes the race at its source instead of widening the timer — a
 * mousedown on a row is not allowed to move focus, so the input never blurs,
 * `focusout` never fires, and the teardown is never scheduled. It is the same
 * trick the @-mention dropdown already uses (`el.onmousedown = ev =>
 * ev.preventDefault()`), and it also leaves the field focused for the next
 * pick, which is exactly what the multi-select guards
 * (`if (isSearchInput(active)) return`) already expect.
 *
 * Bound on the CONTAINER, in the CAPTURE phase, never on the rows themselves:
 * `feed()` replaces every row on each keystroke, so a per-row listener would be
 * lost on the next filter. Scoped to `optionSelector` so a press on anything
 * else inside the box (a scrollbar, padding) keeps its default behaviour.
 * Idempotent — safe to call after every feed.
 *
 * @param {HTMLElement} container      the suggestions box (usually a part's `el`)
 * @param {string}      optionSelector CSS selector matching one pickable row
 */
function keepListThroughClick(container, optionSelector) {
  if (!container || !optionSelector || container.__pickGuardInstalled) return;
  container.__pickGuardInstalled = true;
  container.addEventListener(
    "mousedown",
    (e) => {
      const t = e.target;
      if (t && t.closest && t.closest(optionSelector)) e.preventDefault();
    },
    true,
  );
}

module.exports = { keepListThroughClick };
