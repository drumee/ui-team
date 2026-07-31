/**
 * LAUNCH30 promo — "Start your 1-month Team Plan today", claimed with no
 * card and no Stripe object at all (design doc 2026-07-30). Two states:
 *
 *   offer   → Modal A, the pitch + "Unlock My Free Month" CTA
 *   welcome → Modal B, shown right after a successful claim
 *
 * Triggers (both land here with a different `surface`, never a different
 * eligibility check — the server decides, this widget only renders):
 *   - onboarding-completed (surface: 'home')
 *   - Billing & subscription page mount (surface: 'billing')
 *
 * "Shown once" is a SERVER flag (promo.dismiss -> promo_launch30_mark_seen),
 * not localStorage — the design doc calls this out explicitly as the bug to
 * avoid, so clearing cache or opening on another device must not re-offer a
 * claimed/dismissed promo.
 */
class __promo_launch30 extends LetcBox {
  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._surface = opt.surface === "billing" ? "billing" : "home";
    this._state = opt.state === "welcome" ? "welcome" : "offer";
    this._claiming = false;
    this._trialEndsAt = opt.trial_ends_at || null;
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
    this._render();
  }

  onBeforeDestroy() {
    if (this.el && this.el.parentElement === document.body) {
      document.body.removeChild(this.el);
    }
  }

  // Portalled the same way rating_survey_popup is: Wm renders inside
  // window-manager (z-auto) while this needs to sit above everything,
  // fixed + high z-index.
  _portalToBody() {
    if (!this.el) return;
    if (this.el.parentElement !== document.body) {
      document.body.appendChild(this.el);
    }
  }

  _render() {
    this.feed(require("./skeleton")(this));
  }

  // ───────── skeleton accessors ─────────
  getState() { return this._state; }
  getSurface() { return this._surface; }
  isClaiming() { return this._claiming; }
  getTrialEndsAt() { return this._trialEndsAt; }

  // ───────── persistence ─────────

  _markSeen() {
    return this.postService(SERVICE.promo.dismiss, { surface: this._surface })
      .catch((e) => this.warn && this.warn("[promo-launch30] dismiss failed", e));
  }

  _claim() {
    if (this._claiming) return;
    this._claiming = true;
    this._render();
    const sourceSurface = this._surface === "billing" ? "billing_modal" : "home";
    return this.postService(SERVICE.promo.claim, { source_surface: sourceSurface })
      .then((res) => {
        // Absent/falsy status must NOT read as success — an ACL denial, a
        // network hiccup, or any unexpected response shape all come back
        // without a clean "OK" and must never silently advance to the
        // welcome screen (found during manual test 2026-07-31: a DENIED
        // response left no entitlement granted, yet the UI moved on).
        const data = (res && res.data) || res || {};
        const status = data.status || (res && res.status);
        if (status !== "OK") {
          this._claiming = false;
          this._render();
          if (Wm && Wm.alert) {
            Wm.alert(
              status === "NOT_ELIGIBLE"
                ? (LOCALE.PROMO_NOT_ELIGIBLE || "This offer is no longer available for your account.")
                : (LOCALE.SOMETHING_WENT_WRONG || "Something went wrong. Please try again."),
            );
          }
          return;
        }
        this._trialEndsAt = data.trial_ends_at || null;
        this._claiming = false;
        this._state = "welcome";
        this._render();
      })
      .catch((e) => {
        this._claiming = false;
        this._render();
        this.warn && this.warn("[promo-launch30] claim failed", e);
        if (Wm && Wm.alert) {
          Wm.alert(LOCALE.SOMETHING_WENT_WRONG || "Something went wrong. Please try again.");
        }
      });
  }

  _close() {
    if (this.parent && _.isFunction(this.parent.clear)) this.parent.clear();
    else this.softDestroy();
  }

  // ───────── event routing ─────────

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "promo-dismiss":
        this._markSeen();
        return this._close();

      case "promo-claim":
        return this._claim();

      case "promo-explore":
        // D2 (design doc, 2026-07-30): land on Admin Console -> Members with
        // the Invite panel already open — the trial is worthless until a
        // second person joins. One-shot flag apps-main reads on mount and
        // clears; decoupled from the toggle-apps case so no core desk change
        // is needed to carry the intent across the plugin boundary.
        try { sessionStorage.setItem("drumee_promo_open_invite", "1"); } catch (e) { /* private mode */ }
        this.triggerHandlers({ service: "toggle-apps" });
        return this._close();

      case "promo-later":
        return this._close();

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__promo_launch30.initClass();
module.exports = __promo_launch30;
