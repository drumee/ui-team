/**
 * The Stripe Checkout return (`?checkout=success&session_id=…` or
 * `?checkout=cancel`, written by callback.check_out_*), read ONCE per page.
 *
 * Two parties care about it, at different moments of the boot:
 *
 *   wm.checkCheckoutReturn   feeds the "Payment Success!" / "Payment Failure!"
 *                            result modal.
 *   desk boot popups         the daily reminder and the upgrade nudge stand
 *                            down for this boot, so the receipt is not buried
 *                            under a greeting and an upsell for the plan above
 *                            the one just bought (recording 2026-11-02).
 *
 * The first caller reads the query string and scrubs it (a reload must not
 * replay the modal); every later caller gets the cached answer, so the order
 * in which wm and desk reach it does not matter.
 *
 * It also tracks whether the result modal is on screen — it lives in wm's
 * wrapper-modal slot, which Wm.getItemsByKind cannot see — so the desk's
 * _homePopupsBusy() can count it.
 */

let _read = false;
let _value = null;
let _modalOpen = 0;
let _everOpened = false;
let _leftForBilling = false;
let _waiters = [];

function _flush(how) {
  const w = _waiters;
  _waiters = [];
  w.forEach((fn) => fn(how));
}

/**
 * @returns {{result: "success"|"cancel", session_id: string}|null}
 */
function get() {
  if (_read) return _value;
  _read = true;
  let params;
  try {
    params = new URLSearchParams(window.location.search);
  } catch (e) {
    return null;
  }
  const flag = params.get("checkout");
  if (!flag) return null;
  _value = {
    result: flag === "success" ? "success" : "cancel",
    session_id: params.get("session_id") || "",
  };
  try {
    params.delete("checkout");
    params.delete("session_id");
    const qs = params.toString();
    history.replaceState(
      history.state,
      "",
      `${location.pathname}${qs ? "?" + qs : ""}${location.hash}`,
    );
  } catch (e) {
    /* cosmetic */
  }
  return _value;
}

/** True when this page load is the return leg of a Checkout. */
function isCheckoutBoot() {
  return !!get();
}

/** Called by settings_billing_result on mount (true) and destroy (false). */
function setModalOpen(open) {
  if (open) _everOpened = true;
  _modalOpen = Math.max(0, _modalOpen + (open ? 1 : -1));
  if (!open && _modalOpen === 0) _flush(_leftForBilling ? "left" : "closed");
}

function isModalOpen() {
  return _modalOpen > 0;
}

/**
 * Called by a result-modal action that takes the user to the Billing screen
 * (Use another card / Continue at regular price / Retry payment), BEFORE the
 * modal closes — so whenResultDone can tell "dismissed, back on the desk"
 * from "left for Billing".
 */
function leftForBilling() {
  _leftForBilling = true;
}

/**
 * When is the Checkout return's modal done with the screen?
 *
 * The desk's boot migrate tour waits on this instead of standing down: a new
 * account comes back from Checkout onto its Files tab, and skipping the tour
 * there meant it never came (it only re-offers on a Files PRESS, and the user
 * is already on Files).
 *
 * @param {Object} [opt]
 * @param {Number} [opt.openTimeout=15000] give up waiting for the modal to
 *   APPEAR after this long (chunk failed to load, …)
 * @returns {Promise<"none"|"closed"|"left"|"timeout">}
 *   none     not a Checkout boot — nothing to wait for
 *   closed   the modal was dismissed; the desk is the screen again
 *   left     an action took the user to Billing
 *   timeout  the modal never appeared
 */
function whenResultDone(opt = {}) {
  if (!isCheckoutBoot()) return Promise.resolve("none");
  if (_everOpened && _modalOpen === 0) {
    return Promise.resolve(_leftForBilling ? "left" : "closed");
  }
  return new Promise((resolve) => {
    let done = false;
    const once = (how) => {
      if (done) return;
      done = true;
      resolve(how);
    };
    _waiters.push(once);
    if (!_everOpened) {
      setTimeout(() => {
        if (_everOpened) return;
        _waiters = _waiters.filter((w) => w !== once);
        once("timeout");
      }, opt.openTimeout || 15000);
    }
  });
}

module.exports = {
  get, isCheckoutBoot, setModalOpen, isModalOpen, leftForBilling, whenResultDone,
};
