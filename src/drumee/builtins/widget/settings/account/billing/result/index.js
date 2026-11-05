/**
 * Post-Checkout result modal (design: "Payment Success!" / "Payment Failure!").
 * Fed into the desk wrapper-modal when the Stripe Checkout redirect lands back
 * with ?checkout=success&session_id=… or ?checkout=cancel (wm.checkCheckoutReturn).
 * Receipt details (total, invoice number, date, card) come from
 * payment.checkout_result; every field degrades gracefully when absent.
 */
const { offerStatusMessage } = require("../offer-status");

// Beyond the backdrop, a click here closes a "page fade" modal too: the desk's
// top bar and its sidebar, which the backdrop leaves as they are.
const PAGE_FADE_OUTSIDE = ".desk-module__topbar, .desk-module-sidebar__main";

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
      // The page behind fades while this card is up (desk/skin
      // `[data-billing-result]`) — the Calendar modal's backdrop.
      this._stampDesk(true);
      this._installBackdropDismiss();
    }
    if (this._result === "success" && this._sessionId) {
      // hub_id is REQUIRED (payment.* ACL is scope:hub/src:owner).
      this._receipt = await this.fetchService(SERVICE.payment.checkout_result, {
        hub_id: Visitor.id,
        session_id: this._sessionId,
      }).catch(() => null);
      // Removed while the receipt was in flight (the host was cleared):
      // feeding a destroyed view paints nothing and says nothing.
      if (this.isDestroyed && this.isDestroyed()) return;
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
      const lib = require("libs/checkout-return");
      lib.setModalOpen(false);
      // Only when no result card is left: a second card (a re-feed) must not
      // lose its backdrop to the first one's destroy.
      if (!lib.isModalOpen()) this._stampDesk(false);
    }
    this._removeBackdropDismiss();
  }

  /**
   * CLICK OUTSIDE CLOSES THE CARD — the rule for every "page fade" modal
   * (calendar-main__modal does the same, panel/calendar
   * _installBackdropDismiss).
   *
   * "Outside" is the BACKDROP: the wrapper-modal this card is fed into (it
   * covers the canvas while the card is up), or this widget's own root around
   * the card. Not "anywhere but the card" — the sidebar, the top bar, a
   * popup elsewhere are not the backdrop. Both the press and the release must
   * land on it, so a selection dragged out of the card does not close it.
   * Ignored while a button is busy (Billing opening for "Use another card").
   */
  _installBackdropDismiss() {
    if (this._bdDown) return;
    const isBackdrop = (t) => {
      if (!t || !this.el) return false;
      const card = this.el.querySelector(`.${this.fig.family}__card`);
      if (card && card.contains(t)) return false;
      // The top bar and the sidebar are "outside" too (they stay unfaded).
      if (_.isFunction(t.closest) && t.closest(PAGE_FADE_OUTSIDE)) return true;
      if (this.el.contains(t)) return true;
      // The wrapper-modal, or any container between it and this widget.
      const wrap = _.isFunction(this.el.closest) ? this.el.closest(".window-manager__wrapper-modal") : null;
      return !!(wrap && (t === wrap || (wrap.contains(t) && _.isFunction(t.contains) && t.contains(this.el))));
    };
    let down = false;
    this._bdDown = (e) => { down = isBackdrop(e.target); };
    this._bdClick = (e) => {
      const was = down;
      down = false;
      if (!was || !isBackdrop(e.target)) return;
      if (this.isDestroyed && this.isDestroyed()) return;
      if (this.el && this.el.querySelector('[data-loading="1"]')) return;
      this.triggerHandlers({ service: "billing-result-close" });
    };
    document.addEventListener("pointerdown", this._bdDown, true);
    document.addEventListener("click", this._bdClick, true);
  }

  _removeBackdropDismiss() {
    if (!this._bdDown) return;
    document.removeEventListener("pointerdown", this._bdDown, true);
    document.removeEventListener("click", this._bdClick, true);
    this._bdDown = null;
    this._bdClick = null;
  }

  /**
   * Mark / unmark the desk root while this card is open, naming WHAT it sits
   * on, because the backdrop differs (desk/skin `[data-billing-result]`):
   *
   *   screen  a full-canvas screen is up (Billing, where the Checkout return
   *           lands; the resume card). That screen fades — and the workspace
   *           pane that is always open beneath it is HIDDEN, or the faded,
   *           now see-through screen shows it through (Files and Team Chat
   *           ghosting under the plans).
   *   pane    nothing covers the workspace (Billing could not open): the pane
   *           itself fades.
   */
  _stampDesk(on) {
    try {
      const root = document.querySelector(".desk-module");
      if (!root) return;
      if (!on) {
        delete root.dataset.billingResult;
        return;
      }
      const desk = window.Desk;
      const onScreen = !!(desk && _.isFunction(desk._mainScreenOnTop) && desk._mainScreenOnTop());
      root.dataset.billingResult = onScreen ? "screen" : "pane";
    } catch (e) { /* cosmetic */ }
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
  _reopenOfferCheckout(regular, el) {
    const o = this._offer || {};
    const preselect = { plan: o.plan || "team", cycle: o.cycle || "monthly", tab: "checkout" };
    if (regular) preselect.offer = "decline";
    else if (o.code) preselect.promo = o.code;
    // Tell the boot tour this close is a departure for Billing, not a
    // dismissal back to the desk (libs/checkout-return whenResultDone).
    require("libs/checkout-return").leftForBilling();
    // THE MODAL STAYS UP, its button spinning, until Billing is open: the
    // page is a lazy chunk plus a data load, and closing first left a bare
    // desk with nothing happening. Billing's mount takes the modal down
    // (desk togglePanel → _dismissWmModal); the close below only covers a
    // page that never opened. withButtonBusy also drops a second press and
    // stands the sibling button down while this one works.
    const { withButtonBusy } = require("libs/button-busy");
    return withButtonBusy(el, () => new Promise((resolve) => {
      const timer = setTimeout(resolve, 15000);
      RADIO_BROADCAST.trigger("desk:open-billing-page", {
        ...preselect,
        noLoader: 1, // this button is the loader
        onOpened: () => { clearTimeout(timer); resolve(); },
      });
    })).finally(() => {
      if (!(this.isDestroyed && this.isDestroyed())) {
        this.triggerHandlers({ service: "billing-result-close" });
      }
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
      case "billing-result-offer-other-card":
      case "billing-result-offer-regular-price":
        this._reopenOfferCheckout(service === "billing-result-offer-regular-price", cmd && cmd.el);
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

module.exports = settings_billing_result;
