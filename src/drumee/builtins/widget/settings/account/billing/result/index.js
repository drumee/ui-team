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
    // "cycle": a deferred billing-cycle switch applied in place, with no
    // Checkout session behind it — see onDomRefresh.
    this._result = /^(success|resume|cycle)$/.test(opt.result) ? opt.result : "cancel";
    this._sessionId = opt.session_id || "";
    this._receipt = null;
  }

  async onDomRefresh() {
    if (this._result === "cycle") {
      // A deferred cycle switch no longer goes through Stripe Checkout
      // (payment.change_plan applies it on the live subscription), so there is
      // no session to fetch — the caller already holds every figure. Shape
      // them like a receipt so this renders through the same deferred card as
      // the Checkout path: same words for the same event, whichever route
      // produced it.
      this._receipt = {
        defer: true,
        plan: this.getOption("plan") || "",
        period: this.getOption("period") || "",
        starts_at: this.getOption("starts_at") || 0,
        upcoming_amount: this.getOption("amount"),
        currency: this.getOption("currency") || "",
        // Nothing was taken today, and saying so beats leaving it unsaid —
        // "nothing charged" is the whole point of a deferred switch.
        amount_total: 0,
      };
      this._result = "success";
    } else if (this._result === "success" && this._sessionId) {
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
    }
    this.feed(require("./skeleton").default(this));
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
