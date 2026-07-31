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
    // Seeded position + campaign end date (product decisions 2026-07-31,
    // D1/D3) — both server-computed, never invented client-side.
    this._position = opt.position || null;
    this._campaignEndsAt = opt.campaign_ends_at || null;
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
  getPosition() { return this._position; }
  getCampaignEndsAt() { return this._campaignEndsAt; }

  // ───────── persistence ─────────

  // ACL is scope:hub / src:owner (same as payment.*) — hub_id must be the
  // caller's personal hub. Omitting it yields PERMISSION_DENIED 403 before
  // the worker ever runs (reproduced 2026-07-31 against promo.claim).
  _hubId() {
    return this.mget(_a.hub_id) || Visitor.id;
  }

  _markSeen() {
    return this.postService(SERVICE.promo.dismiss, {
      hub_id: this._hubId(),
      surface: this._surface,
    }).catch((e) => this.warn && this.warn("[promo-launch30] dismiss failed", e));
  }

  /**
   * org_provision moves the payer onto a new domain + Team quota. Bootstrap
   * globals (Visitor.quota / domain_id, Organization) stay frozen on Free
   * until refreshed — Desk's Admin Console gate (needsAdminConsoleUpgrade)
   * then short-circuits to the Unlock upsell until a full page reload.
   * Mirror init_globals from yp.get_env; fall back to the claim payload quota.
   */
  async _refreshSessionAfterClaim(data = {}) {
    try {
      const env = await this.fetchService(SERVICE.yp.get_env, { hub_id: Visitor.id });
      if (env && env.user) {
        if (typeof Visitor !== "undefined" && Visitor.respawn) Visitor.respawn(env.user);
        else if (typeof Visitor !== "undefined" && Visitor.set) Visitor.set(env.user);
        if (env.organization && typeof Organization !== "undefined" && Organization.set) {
          Organization.set(env.organization);
        }
        if (env.hub && typeof Host !== "undefined" && Host.set) {
          Host.set(env.hub);
        }
        return;
      }
    } catch (e) {
      this.warn && this.warn("[promo-launch30] get_env after claim failed", e);
    }
    if (data.quota && typeof Visitor !== "undefined" && Visitor.respawn) {
      Visitor.respawn({ plan: "team", quota: data.quota });
    }
  }

  _claim() {
    if (this._claiming) return;
    this._claiming = true;
    this._render();
    const sourceSurface = this._surface === "billing" ? "billing_modal" : "home";
    return this.postService(SERVICE.promo.claim, {
      hub_id: this._hubId(),
      source_surface: sourceSurface,
    })
      .then(async (res) => {
        // Absent/falsy status must NOT read as success — an ACL denial, a
        // network hiccup, or any unexpected response shape all come back
        // without a clean "OK" and must never silently advance to the
        // welcome screen (found during manual test 2026-07-31: a DENIED
        // response left no entitlement granted, yet the UI moved on).
        if (res && (res.error || res.error_code === 403 || res.status === 403)) {
          this._claiming = false;
          this._render();
          if (Wm && Wm.alert) {
            Wm.alert(LOCALE.SOMETHING_WENT_WRONG || "Something went wrong. Please try again.");
          }
          return;
        }
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
        await this._refreshSessionAfterClaim(data);
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

  /**
   * D2: land on Admin Console → Members with Invite open. org_provision
   * rewrote domain/vhost — same stale-bootstrap problem billing solves with
   * a full reload on payment.org_provisioned. Flags survive the reload;
   * Desk opens Admin, apps-main opens Invite.
   *
   * triggerHandlers(toggle-apps) is a no-op here: Wm.launch does not wire
   * uiHandler to Desk, so the service never reached the sidebar handler.
   */
  _exploreAfterClaim() {
    try {
      sessionStorage.setItem("drumee_promo_open_invite", "1");
      sessionStorage.setItem("drumee_promo_open_admin", "1");
    } catch (e) { /* private mode */ }
    this._close();
    window.location.reload();
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
        return this._exploreAfterClaim();

      case "promo-later":
        return this._close();

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__promo_launch30.initClass();
module.exports = __promo_launch30;
