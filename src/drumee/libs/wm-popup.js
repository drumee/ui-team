/**
 * Close a popup that was launched through `Wm.launch(..., { explicit: 1 })`.
 *
 * ── The bug this exists to stop coming back ──────────────────────────────────
 * `parent.clear()` is `collection.reset()`. It is the right close ONLY when the
 * parent is a single-widget modal host, where the reset also clears the host's
 * `data-state` (the stuck-overlay rule). A popup launched with `explicit: 1` is
 * NOT in such a host: it is appended to `Wm.getWindowsPool(kind)`, which is a
 * SHARED layer — `windowsLayer`, or `headlessLayer` whenever a workspace pane
 * is open. Measured on the endpoint with a workspace open:
 *
 *     Wm.getWindowsPool("<any of these kinds>") === Wm.headlessLayer   // true
 *     pool.children -> ["window_folder", "<the popup>"]
 *
 * So `clear()` there destroys the WORKSPACE PANE along with the popup, and the
 * user is left on a blank desk. The top-bar symptom is what usually gets
 * reported, and it is why this took so long to place the first time: with no
 * pane left, the next repaint of the breadcrumb (`_restoreCurrentPath` ->
 * `headlessPane()` -> null) falls through to `loadDefault()` and empties the
 * track — and the address chip's spinner is the pure-CSS "no crumbs in the
 * chip" condition, so an EMPTY track IS the loading state, with nothing left to
 * re-signal it. The chip spins for the rest of the session.
 *
 * Reported from production three times now, each time against a different
 * widget and each time diagnosed from scratch: the migrate-gdrive popup
 * ("closing the migrate popup closes the folder window"), the promo modal ("it
 * took the Account window with it") and the daily reminder ("blank workspace
 * after closing the card"). The logic lives here so the fourth one is a single
 * call rather than a fourth investigation.
 *
 * ── The rule ─────────────────────────────────────────────────────────────────
 * WHEN WE SHARE THE PARENT WITH ANYONE ELSE, REMOVE ONLY OURSELVES.
 *
 * `soleChild` is not a heuristic: the popup is itself in that collection, so a
 * count of 1 means the pool holds the popup and nothing else — precisely the
 * case where `clear()` destroys nothing but us and still gets the modal-host
 * reset. Any other count means something else is in there to protect.
 *
 * `goodbye()` runs the standard exit animation and then destroys; `softDestroy`
 * is the fallback for a view that somehow has neither. Callers that broadcast
 * or navigate after closing may keep doing so — read anything you need off the
 * view BEFORE calling this, because the view is on its way out.
 *
 * ⚠️ `migrate-gdrive-popup._teardown()` still carries its own inline copy of
 * this guard. It is byte-identical in behaviour, but it was left in place
 * rather than refactored blind: exercising it needs a real Google Drive
 * migration, and an unverifiable refactor of a working close path is not worth
 * the tidiness. Fold it in when someone is next in that flow with the ability
 * to test it.
 *
 * @param {Object} view the popup view closing itself (`this`)
 */
function closeWmPopup(view) {
  if (!view) return;
  // Re-entry guard: over-limit-popup can close from a RADIO_BROADCAST handler
  // while a click is already closing it, and `goodbye()` destroys on a timer,
  // so a second call can land inside that window.
  if (view.isDestroyed && view.isDestroyed()) return;
  const p = view.parent;
  const soleChild = p?.children?.length === 1;
  if (soleChild && _.isFunction(p.clear)) p.clear();
  else if (_.isFunction(view.goodbye)) view.goodbye();
  else view.softDestroy();
}

module.exports = { closeWmPopup };
