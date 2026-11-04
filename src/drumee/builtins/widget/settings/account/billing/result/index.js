/**
 * Post-Checkout result modal (design: "Payment Success!" / "Payment Failure!").
 * Fed into the desk wrapper-modal when the Stripe Checkout redirect lands back
 * with ?checkout=success&session_id=… or ?checkout=cancel (wm.checkCheckoutReturn).
 * Receipt details (total, invoice number, date, card) come from
 * payment.checkout_result; every field degrades gracefully when absent.
 */
const { offerStatusMessage } = require("../offer-status");

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
    // Lets the desk's _homePopupsBusy() see this modal: it lives in wm's
    // wrapper-modal slot, out of Wm.getItemsByKind's reach.
    if (!this._countedOpen) {
      this._countedOpen = true;
      require("libs/checkout-return").setModalOpen(true);
    }
    if (this._result === "success" && this._sessionId) {
      // hub_id is REQUIRED (payment.* ACL is scope:hub/src:owner).
      this._receipt = await this.fetchService(SERVICE.payment.checkout_result, {
        hub_id: Visitor.id,
        session_id: this._sessionId,
      }).catch(() => null);
      if (this._receipt && this._receipt.status === "SESSION_NOT_FOUND") this._receipt = null;
      // The bank wants the first payment confirmed (3DS): the server moved the
      // purchase to a Stripe page that can show the challenge. Go there.
      if (this._receipt?.status === "OFFER_ACTION_REQUIRED" && this._receipt.url) {
        window.location.assign(this._receipt.url);
        return;
      }
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
      // An offer checkout (TEAM1) can be refused once the card is known —
      // say why instead of a bare "payment failed".
      this._failReason = offerStatusMessage(this._receipt?.status);
      if (this._failReason) this._result = "cancel";
      // The card already redeemed this offer (once_per_card, e.g. TEAM1).
      // Nothing was charged and the card itself is fine, so this is not a
      // "Payment Failure!": give it its own card with the two ways forward —
      // another card for the offer, or the same plan at the regular price.
      if (this._receipt?.status === "OFFER_CARD_USED") {
        this._result = "offer_card_used";
        this._offer = {
          code: this._receipt.offer_code || "",
          plan: this._receipt.plan || "team",
          cycle: /^year/.test(String(this._receipt.period || "")) ? "yearly" : "monthly",
        };
      }
    }
    this.feed(require("./skeleton").default(this));
  }

  onBeforeDestroy() {
    if (this._countedOpen) {
      this._countedOpen = false;
      require("libs/checkout-return").setModalOpen(false);
    }
  }

  /**
   * OFFER_CARD_USED → back to the SAME checkout (plan + cycle from the
   * refused session). A Team checkout also needs the org name/ident form, so
   * it goes through the billing page rather than straight to Stripe.
   *
   * @param {boolean} regular  true = buy without the offer. `offer: "decline"`
   *   stops the billing page re-applying the account's pending signup offer
   *   (payment.offer_pending), which would otherwise put the code straight back.
   */
  _reopenOfferCheckout(regular) {
    const o = this._offer || {};
    const preselect = { plan: o.plan || "team", cycle: o.cycle || "monthly", tab: "checkout" };
    if (regular) preselect.offer = "decline";
    else if (o.code) preselect.promo = o.code;
    // Close first (wm clears the wrapper-modal), then open the page.
    this.triggerHandlers({ service: "billing-result-close" });
    RADIO_BROADCAST.trigger("desk:open-billing-page", preselect);
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
      case "billing-result-offer-other-card":
      case "billing-result-offer-regular-price":
        this._reopenOfferCheckout(service === "billing-result-offer-regular-price");
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = settings_billing_result;
