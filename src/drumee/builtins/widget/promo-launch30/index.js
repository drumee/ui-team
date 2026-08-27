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
    this._state = ["welcome", "ended"].includes(opt.state) ? opt.state : "offer";
    // Second screen of the 'ended' gate — reached only by choosing Free with a
    // workspace that no longer fits it. Informational: the plan already
    // changed on promoExpiryWorker's timer long before this renders.
    this._endedOverLimit = false;
    this._overLimit = opt.over_limit || null;
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
    this._warmAdminConsole();
    if (this._state === "ended") {
      // A gate, not a one-shot: rendering it must NOT mark anything seen, or
      // it would never come back and the owner could dodge the choice by
      // reloading. Only answering it (_markEndedAnswered) closes it for good.
      this._track("trial_ended_popup_shown", { over_limit: this._overLimit ? 1 : 0 });
      return;
    }
    // Show-once: mark the surface seen as soon as the modal actually
    // renders, not only on an explicit X-dismiss (tester feedback
    // 2026-07-31 #3 — the full modal must never re-appear once shown,
    // whether the user closes it, claims, or just navigates away).
    this._markSeen();
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

  /**
   * Fetch the Admin Console bundle while the user is still reading Modal B.
   *
   * "Start exploring now" is a click on a button whose destination is a plugin
   * this document has never loaded — a brand-new org domain, first session.
   * Measured end to end on stage with a real new account: 3786ms from click to
   * a visible console, of which 3202ms was ONE chunk,
   * src_widgets_apps-main_index_js at 1.58 MB (24 chunks, 2.9 MB, fetched 23
   * at a time, so the concurrency was never the problem — that one file was).
   *
   * Nobody clicks instantly: Modal B is four paragraphs and a trial end date.
   * Spending those seconds on the download turns the click into a cache hit.
   * The same warm-up is why the second open in a session is already fast.
   *
   * Welcome surface only. On the OFFER modal the user has not claimed
   * anything, may never claim, and on Free has no Admin Console to open —
   * downloading 2.9 MB at them there would be a cost with no destination.
   *
   * Entirely best-effort: no await, failures swallowed. If the bundle is not
   * there when the click comes, _exploreAfterClaim's broadcast loads it the
   * normal way, exactly as before.
   */
  _warmAdminConsole() {
    if (this._state !== "welcome") return;
    try {
      if (Kind.get("apps_main")) return;
      Kind.loadPlugin({ name: "admin-console", kind: "apps_main" }).catch(() => {});
    } catch (e) { /* never let a prefetch break the modal */ }
  }

  // ───────── skeleton accessors ─────────
  getState() { return this._state; }
  isOverLimitScreen() { return this._endedOverLimit; }

  /**
   * Price for the gate's headline figure, in the viewer's locale.
   *
   * Intl where available so a French viewer reads "29 $" and not "$29"; the
   * plain form is the fallback for anything that cannot do it.
   */
  formatMoney(amount) {
    try {
      return new Intl.NumberFormat(Visitor.language && Visitor.language() || "en", {
        style: "currency", currency: "USD", maximumFractionDigits: 0,
      }).format(amount);
    } catch (e) {
      return `$${amount}`;
    }
  }

  /**
   * Report a step of the trial-ended funnel.
   *
   * Named events rather than one generic upgrade-popup counter, because the
   * KPI that matters is trial -> paid, and it has to be separable from every
   * other upgrade prompt in the product. Self-gating off drumee.com — see
   * libs/gtag.
   */
  _track(name, params = {}) {
    try {
      require("libs/gtag").event(name, params);
    } catch (e) { /* measurement must never break the flow being measured */ }
  }
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

  // 'welcome' (Modal B) is its own one-shot surface, distinct from the
  // home/billing surface the widget was launched with — see
  // promo_launch30_mark_seen / welcome_seen_at.
  _markSeen() {
    if (this._seenMarked) return Promise.resolve();
    this._seenMarked = true;
    const surface = this._state === "welcome" ? "welcome" : this._surface;
    return this.postService(SERVICE.promo.dismiss, {
      hub_id: this._hubId(),
      surface,
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
        // Do NOT flip to "welcome" and re-render here. org_provision moved
        // this session onto a brand-new org domain, and refreshing the
        // session below is closely followed by an automatic redirect this
        // widget does not control the timing of — one that reliably wins
        // the race against showing Modal B and waiting for a click (tester
        // feedback 2026-07-31 #2: modal flashed, then the page went blank
        // mid-navigation). Leave the busy "Setting up your workspace…"
        // state showing through that redirect instead; Modal B shows
        // itself once, server-flag-gated, on the new domain's first home
        // mount (see Desk._maybeShowPromoLaunch30).
        await this._refreshSessionAfterClaim(data);
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

  /**
   * Remove THIS modal, and nothing else.
   *
   * `parent.clear()` was wrong: launched with {explicit:1}, this widget is
   * appended to Wm.getWindowsPool(), which is a SHARED layer — windowsLayer,
   * or headlessLayer whenever a workspace is open. Measured on stage: with the
   * Account window open, the promo modal's parent reports children
   * ["window_account", "promo_launch30"], so clearing the parent took the
   * user's Account window down with the promo.
   *
   * Nothing noticed while "Start exploring now" reloaded the page a moment
   * later, but "Maybe later" and the X have always closed straight into it.
   */
  _close() {
    this.goodbye();
  }

  /**
   * The trial-ended gate has been ANSWERED.
   *
   * Distinct from _markSeen: the other surfaces record "we showed it", this
   * records "they chose", and it is the only thing that stops the modal
   * returning on the next home mount. Awaited by the callers so the choice is
   * durable before the modal disappears — a failed write here means the gate
   * comes back, which is the safe way to be wrong.
   */
  _markEndedAnswered() {
    return this.postService(SERVICE.promo.dismiss, {
      hub_id: this._hubId(),
      surface: "ended",
    }).catch((e) => this.warn && this.warn("[promo-launch30] ended dismiss failed", e));
  }

  /**
   * Upgrade — hand off to the existing Billing checkout, preselected on Team.
   *
   * Deliberately no payment UI of our own: the billing page owns Stripe, the
   * cycle switch, proration and every error path already. This only names the
   * destination.
   */
  async _endUpgrade() {
    this._track("trial_upgrade_clicked", { plan: "team" });
    await this._markEndedAnswered();
    this._close();
    RADIO_BROADCAST.trigger("desk:open-billing-page", { plan: "team" });
  }

  /**
   * Continue on Free.
   *
   * Two outcomes. A workspace that still fits Free is simply let go — the
   * choice is recorded and the gate closes. One that does not gets the second
   * screen, which explains what is locked and how long they have; the org is
   * ALREADY over-limit at this point (promoExpiryWorker ran OverLimit.evaluate
   * when it cleared the entitlement), so this reports that state rather than
   * causing it.
   */
  async _endContinueFree() {
    this._track("trial_continue_free_clicked");
    await this._markEndedAnswered();
    if (!this._overLimit) return this._close();
    this._track("trial_downgrade_lock_applied", this._overLimit);
    this._endedOverLimit = true;
    this._render();
  }

  /** Straight into the existing over-limit resolution flow. */
  _endResolve() {
    this._close();
    RADIO_BROADCAST.trigger("desk:open-admin-console", { tab: "storage" });
  }

  /**
   * D2: land on Admin Console → Members with Invite open.
   *
   * This used to set two flags and call location.reload(), on the reasoning
   * that org_provision had rewritten domain/vhost and the bootstrap globals
   * were stale. They are not stale by the time anyone can click this button:
   * Modal B is only ever launched by Desk._maybeShowPromoLaunch30 on a HOME
   * MOUNT, from promo.get_state reporting claimed_active — i.e. in a document
   * that booted AFTER the claim, with a get_env that already reflects the new
   * org. (And a reload could not have fixed a domain move anyway: it re-loads
   * the same URL, it does not move origin.)
   *
   * So the reload bought nothing and cost a full app boot. Measured on stage,
   * with everything warm in cache, the chain that has to complete before the
   * console can even begin to open is yp.get_env 305-600ms, bootstrap.authn
   * 680-827ms, desk.get_env 841-976ms, bootstrap.plugin 1179-1304ms — ~1.3s,
   * plus the 400ms timer the reload path then waits out in
   * Desk._maybeOpenPromoAdminAfterClaim, plus the desk skeleton and a restore
   * pass that sleeps 300ms of its own. Reported by a tester as ~5s to reach
   * the console.
   *
   * The same door the over-limit popup uses is already open and costs none of
   * that: the broadcast lands on Desk._openAdminConsole -> _toggleAppsShim,
   * the exact command the sidebar item sends. A broadcast rather than
   * triggerHandlers because Wm.launch does not wire uiHandler to Desk, which
   * is what defeated the first attempt at this.
   *
   * The invite flag stays — admin-console's apps-main is a separate bundle
   * with no reference to this widget, and a one-shot key is how it is told to
   * open the panel. It is read and cleared in _loadMembersTab, which the
   * "member" tab below guarantees will run.
   */
  _exploreAfterClaim() {
    try {
      sessionStorage.setItem("drumee_promo_open_invite", "1");
    } catch (e) { /* private mode */ }
    this._close();
    RADIO_BROADCAST.trigger("desk:open-admin-console", { tab: "member" });
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

      // ── trial-ended gate ──
      case "promo-end-upgrade":
        return this._endUpgrade();
      case "promo-end-continue-free":
        return this._endContinueFree();
      case "promo-end-resolve":
        return this._endResolve();

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__promo_launch30.initClass();
module.exports = __promo_launch30;
