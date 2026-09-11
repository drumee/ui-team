const { promoYearlyCountdown, promoYearlySecondsLeft } = require("libs/billing");

/**
 * September 2026 campaign modal — "LIMITED-TIME 50% OFF" (Figma "Drumee 2.0"
 * node 696-141463; the frame is still named "Invite your team members" in the
 * file, which is a stale layer name, not a different design).
 *
 * Deliberately dumb: it renders and it reports two clicks. WHO sees it and HOW
 * OFTEN is decided by settings_billing._maybeShowPromoYearly(), which is the
 * only thing that knows the catalog, the subscription and the campaign gate.
 * Keeping the decision there is what stops a second copy of the eligibility
 * rules drifting away from the banner's.
 *
 * Opened with Wm.launch({singleton:1}) and portalled to <body>, the same
 * arrangement promo_launch30 uses — fixed positioning at a high z-index beats
 * the desk chrome wherever Wm happens to mount it.
 */
class __promo_yearly extends LetcBox {
  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    // The page that opened this owns the "go to Yearly" action — it has the
    // tab state.
    this._origin = opt.origin || null;
    // The saving, MEASURED off the catalog by the page that opened this. The
    // copy says "{0}% OFF", never a literal 50, for the same reason the
    // Billing banner does: the number has to be the one Stripe is actually
    // giving. The modal is only ever opened when that is >= the campaign's
    // advertised figure, so the artwork's baked-in "50%" cannot overstate.
    this._pct = Number.parseInt(opt.pct, 10) || 0;
  }

  /** Wm.launch({singleton:1}) reuses the instance and calls .raise(). */
  raise() {
    if (this.el) {
      this.el.style.display = "";
      this.el.style.zIndex = 99998;
    }
    return this;
  }

  onDomRefresh() {
    this._portalToBody();
    this.feed(require("./skeleton")(this));
    this._startCountdown();
  }

  onBeforeDestroy() {
    this._stopCountdown();
    // Portalled to <body> in onDomRefresh, so it has to take itself back out;
    // Wm only knows about the mount point it gave us.
    if (this.el?.parentElement === document.body) this.el.remove();
  }

  _portalToBody() {
    if (!this.el) return;
    if (this.el.parentElement !== document.body) {
      document.body.appendChild(this.el);
    }
  }

  /** "21 DAYS 06:48:00" — the same helper the Billing banner counts with. */
  countdownText() {
    return promoYearlyCountdown();
  }

  /** Whole-percent saving this modal is advertising. */
  pct() {
    return this._pct;
  }

  /**
   * One interval for the widget's lifetime, re-feeding the text node through
   * the framework rather than writing into it — Skeletons.Note keeps its text
   * in an inner .note-content div it rebuilds itself, so touching the outer
   * element's textContent fights the note widget.
   */
  _startCountdown() {
    if (this._timer) return;
    this._timer = setInterval(() => {
      const part = this.__countdown;
      if (this.isDestroyed() || !part?.el?.isConnected) return this._stopCountdown();
      // Ran out while the modal sat open. Close it rather than sit on
      // 00:00:00 advertising an offer that has just ended.
      if (promoYearlySecondsLeft() <= 0) {
        this._stopCountdown();
        return this.goodbye();
      }
      if (typeof part.softClear === "function") part.softClear();
      part.feed(require("./skeleton").countdownNote(this));
    }, 1000);
  }

  _stopCountdown() {
    clearInterval(this._timer);
    this._timer = null;
  }

  onPartReady(child, pn) {
    if (pn === `${this.fig.family}__countdown`) {
      this.__countdown = child;
      return;
    }
    if (super.onPartReady) super.onPartReady(child, pn);
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.get(_a.service);
    switch (service) {
      case "promo-yearly-close":
        this.goodbye();
        break;
      case "promo-yearly-cta":
        // Lexis, 2026-09-11: the CTA switches to the Yearly tab. The billing
        // page does the switching — it owns the tab state — and this closes
        // itself so the prices it just pointed at are actually visible.
        if (this._origin && !this._origin.isDestroyed?.()) {
          this._origin.showYearlyFromPromo();
        }
        this.goodbye();
        break;
      // New tab on purpose: these are welcome-module routes, so following
      // them in place would unmount the desk and the billing page with it.
      case "promo-yearly-privacy":
        window.open(`${location.pathname}#/welcome/privacy`, "_blank", "noopener");
        break;
      case "promo-yearly-terms":
        window.open(`${location.pathname}#/welcome/terms`, "_blank", "noopener");
        break;
      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}
__promo_yearly.initClass();

module.exports = __promo_yearly;
