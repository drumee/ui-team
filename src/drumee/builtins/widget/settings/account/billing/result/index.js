/**
 * Post-Checkout result modal (design: "Payment Success!" / "Payment Failure!").
 * Fed into the desk wrapper-modal when the Stripe Checkout redirect lands back
 * with ?checkout=success&session_id=… or ?checkout=cancel (wm.checkCheckoutReturn).
 * Receipt details (total, invoice number, date, card) come from
 * payment.checkout_result; every field degrades gracefully when absent.
 */
class settings_billing_result extends LetcBox {
  initialize(opt = {}) {
    require("./skin");
    super.initialize(opt);
    // "resume" (Figma 3050-96691): confirmation after a subscription resume —
    // check icon + "Resume Subscription" + a single Done button, no receipt.
    this._result = /^(success|resume)$/.test(opt.result) ? opt.result : "cancel";
    this._sessionId = opt.session_id || "";
    this._receipt = null;
  }

  async onDomRefresh() {
    if (this._result === "success" && this._sessionId) {
      // hub_id is REQUIRED (payment.* ACL is scope:hub/src:owner).
      this._receipt = await this.fetchService(SERVICE.payment.checkout_result, {
        hub_id: Visitor.id,
        session_id: this._sessionId,
      }).catch(() => null);
      if (this._receipt && this._receipt.status === "SESSION_NOT_FOUND") this._receipt = null;
      // A session that never got paid renders the failure shell instead.
      //
      // 'no_payment_required' is NOT such a session: Stripe reports it when
      // the session's total is 0, which is exactly what a deferred cycle
      // switch produces (the new cycle idles on a trial until the paid period
      // lapses). Treating it as unpaid showed "Payment Failure!" for a switch
      // that had gone through — so only a genuinely unpaid session fails here.
      const ps = this._receipt && this._receipt.payment_status;
      if (ps && ps !== "paid" && ps !== "no_payment_required") {
        this._result = "cancel";
      }
      this._reportConversion();
    }
    this.feed(require("./skeleton").default(this));
  }

  /**
   * Tell Google Ads a purchase happened.
   *
   * Here rather than anywhere else because this is the one place in the client
   * that knows a Checkout session came back PAID: `wm.checkCheckoutReturn`
   * only sees ?checkout=success in the URL, which says the browser was
   * redirected, not that Stripe took the money. The receipt fetched above is
   * what separates the two, and the guard below re-reads `_result` because the
   * unpaid case has just rewritten it to "cancel".
   *
   * The amount is what was CHARGED TODAY. A deferred switch or an MKT promo
   * bills 0 now and the real amount later, so those report a conversion worth
   * 0 -- the action is real, the revenue has not happened yet. The later charge
   * is collected by webhook with no browser in the loop, so it will never
   * arrive here; if Ads should instead carry the committed amount, that is
   * `upcoming_amount` on the same receipt, and it is a reporting decision
   * rather than a bug.
   *
   * Client-side reporting misses whoever closes the tab before the redirect
   * lands, and whoever blocks the tag. Server-side (Ads Conversions API, off
   * the Stripe webhook that already runs) is the answer to that, and a much
   * larger change than this one.
   */
  _reportConversion() {
    if (this._result !== "success") return;
    const receipt = this._receipt || {};
    const minor = receipt.amount_total;
    require("libs/gtag").conversion("purchase", {
      // Stripe reports minor units; Ads wants major.
      value: Number.isFinite(minor) ? minor / 100 : 0,
      currency: String(receipt.currency || "usd").toUpperCase(),
      // The session id, not the invoice number: it is unique per checkout and
      // always present on this path, while `invoice_number` is null whenever
      // Stripe issued no invoice.
      transaction_id: this._sessionId,
    });
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
    switch (service) {
      case "billing-result-close":
      case "billing-result-retry":
        // Bubble to the window manager (uiHandler): close clears the
        // wrapper-modal; retry re-opens the billing checkout.
        this.triggerHandlers({ service });
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = settings_billing_result;
