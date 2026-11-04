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
  _modalOpen = Math.max(0, _modalOpen + (open ? 1 : -1));
}

function isModalOpen() {
  return _modalOpen > 0;
}

module.exports = { get, isCheckoutBoot, setModalOpen, isModalOpen };
