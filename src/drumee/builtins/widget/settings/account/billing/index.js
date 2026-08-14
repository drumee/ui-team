const { canUpgradePlan, billingAvailable } = require("libs/billing");

const TAB_MONTHLY = 0;
const TAB_YEARLY = 1;
const TAB_CHECKOUT = 2;

const formatCurrency = (amount) => {
  return `$${amount.toFixed(2)}`;
};

class settings_billing extends LetcBox {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    // Mount modes (mutually exclusive):
    //  - popup:1  → legacy popup shell (title bar + close) over Settings.
    //  - page:1   → full-page render inside the desk settings-main-slot (the
    //               Figma design: a Settings sub-page with a big title +
    //               breadcrumb "Home › Billing & Subscription", NOT a popup).
    //  - neither  → headerless embed (settings_account Billing tab).
    this._popup = !!(opt && parseInt(opt.popup) === 1);
    this._page = !!(opt && parseInt(opt.page) === 1);
    this.model.set({
      hub_id: Visitor.id,
      flow: "g",
    });

    this.state = {
      currentTab: TAB_MONTHLY,
      plansTab: {
        cycle: "monthly",
        selectedPlan: null,
      },
      checkout: {
        selectedPlan: "free",
        seats: 0,
        storage: 0,
        billingCycle: "monthly",
        selectedBundle: null,
      },
    };
    // Storage in GB and the member CAP per plan, mirroring yp.plan's quota
    // JSON (2026-07 pricing rebuild). `seats` is a cap, not a purchased
    // quantity — free stays 0 because existing code reads 0 as "cannot
    // invite", and business uses a real large number rather than 0, which
    // would read as no seats at all.
    this.storage = {
      free: 5,
      pro: 50,
      team: 100,
      business: 1000
    }
    // Member caps, counting the owner — same scale on every tier, and the
    // same numbers the catalog grants (yp.plan quota.$.seat). Free and Pro
    // moved off 0/1 in the 2026-08-14 pricing restructure: blocking every
    // invite on the two entry tiers cut the referral loop exactly where it
    // starts. Keep in step with the catalog; a number invented here only
    // changes the label, never what the server allows.
    this.seats = {
      free: 3,
      pro: 3,
      team: 10,
      business: 100000
    }

    // Preselect plan/cycle/tab from a #/desk/billing?plan=&cycle=&tab= deep link
    // (threaded in via openBillingPage → togglePanel opt). A no-op when the panel
    // is opened without those params, so every existing entry point is unchanged.
    this._applyDeepLink(opt);

    this.tab = this.state.currentTab;
    // Subscribe to live WS via the framework channel (replaces the leaky
    // Wm.on('ws:event') that never unsubscribed). Dispatcher calls
    // onWsMessage(service, data, options) with the service as the FIRST arg.
    this.bindEvent(_a.live);
  }

  onBeforeDestroy() {
    this.unbindEvent(_a.live);
    if (this._onVisibility) {
      document.removeEventListener("visibilitychange", this._onVisibility);
      this._onVisibility = null;
    }
  }

  onWsMessage(service, data, options = {}) {
    switch (service) {
      case "payment.plan_updated":
        Visitor.respawn(data);
        // Refresh our own subscription mirror + re-render so a pending cancel
        // (or a resume) confirmed by the webhook lands in realtime; then bubble
        // up so the Settings card status line refreshes too.
        this._loadSubscription().then(() => { if (!this.isDestroyed()) this.fetchPlanData(); });
        this.triggerHandlers({ service: "plan_updated" });
        break;
      case "payment.org_provisioned":
        // TEAM bootstrap completed server-side: the payer now lives on the
        // new org domain (drumate/vhost/entity dom moved by org_provision).
        // Everything bootstrap-frozen (Visitor, Organization, endpoints) is
        // stale — a full reload lands the session on its new home.
        if (Wm && Wm.alert) Wm.alert(LOCALE.ORG_PROVISIONED);
        setTimeout(() => window.location.reload(), 2500);
        break;
      default:
        if (super.onWsMessage) super.onWsMessage(service, data, options);
    }
  }

  // Fetch the caller's subscription mirror and derive the pending-cancel flags
  // the banner + cancel/resume actions read. A hard cancel removes the mirror
  // row → _subscription null → no banner (workspace already on Free).
  //
  // LAUNCH30 (no Stripe): when quota says Team but there is no subscription
  // mirror, ask promo.get_state — a claimed_active trial drives the same
  // banner + Cancel plan path via promo.cancel (immediate end), not
  // payment.cancel_subscription (which would 404 as NO_SUBSCRIPTION).
  async _loadSubscription() {
    const raw = await this.fetchService(SERVICE.payment.subscription_status, { hub_id: Visitor.id })
      .catch(() => null);
    // Read the server's checkout verdict BEFORE the row is discarded below. A
    // caller with no subscription still gets a can_buy answer, and that is
    // exactly the case that used to walk into a dead end.
    this._canBuy = raw && typeof raw.can_buy === "boolean" ? raw.can_buy : null;
    this._subscription = raw && raw.subscription_id ? raw : null;
    // member_count is enriched on subscription_status even when there is no
    // Stripe mirror (LAUNCH30 org) — keep it for cancel-consequence copy.
    this._memberCount = ~~(raw && raw.member_count);
    const sub = this._subscription;
    const now = Math.floor(Date.now() / 1000);
    this._periodEnd = (sub && Number(sub.period_end)) || 0;
    // Pending cancel = mirror status 'canceled' with the paid period still in
    // the future (access retained until period_end). Distinct from a terminated
    // sub, whose row is gone.
    this._isCanceling = !!(sub && sub.status === "canceled" && this._periodEnd > now);
    this._hasPaidSub = !!(sub && sub.subscription_id);
    this._isPromoTrial = false;
    // Live subscription = nothing left to buy self-serve. The tier ladder is
    // free < team < (business | sovereign = sales-led), so a Team subscriber
    // has no higher self-serve tier to reach and no reason to re-buy the one
    // they hold. "Live" includes the PENDING-CANCEL window: it mirrors as
    // 'canceled' but Stripe still holds an active subscription carrying
    // cancel_at_period_end, so buying now would run two paid subscriptions at
    // once. That caller resumes (the banner offers it); only once the paid
    // period lapses may they buy again.
    // past_due is live as well: Stripe retries that invoice for weeks before
    // giving up, so the caller still holds a subscription and must not be sent
    // to checkout to buy a second one. Counting it here routes them to the
    // in-place switch (which the server accepts while past_due) instead.
    this._hasActiveSub =
      !!(sub && /^(active|trialing|past_due)$/.test(sub.status || "")) || this._isCanceling;

    if (!this._hasPaidSub && this._isPaidByQuota()) {
      try {
        const promo = await this.fetchService(SERVICE.promo.get_state, { hub_id: Visitor.id });
        if (promo && promo.state === "claimed_active") {
          this._isPromoTrial = true;
          this._periodEnd = Number(promo.trial_ends_at) || this._periodEnd;
          // Treat the free trial as a live entitlement for checkout gating —
          // same as a paid Team sub: don't offer a second self-serve buy.
          this._hasActiveSub = true;
        }
      } catch (e) { /* promo module optional / offline */ }
    }
    // The flags above are now authoritative — until here a click on a plan
    // card had to fall back to the synchronous quota signal (_paidPlanSync).
    this._subLoaded = true;
    return sub;
  }

  /**
   * May the Checkout tab be entered at all? False once a subscription is
   * live: the server refuses such a checkout (ALREADY_SUBSCRIBED), and
   * without this the tab walked the user through a purchase flow that could
   * only dead-end -- or, before the server guard, charge them twice.
   * @returns {boolean}
   */
  _checkoutTabAllowed() {
    // A replacement in progress is the one case where a live subscriber may
    // reach checkout: they accepted the warning, and the server admits them on
    // the supersede flag.
    if (this.state && this.state.checkout && this.state.checkout.supersede) {
      return this._mayCheckout();
    }
    // LAUNCH30 trial has no Stripe subscription. Checkout must stay open so
    // the user can convert with an MKT outreach partner code (trial + % off).
    if (this._isPromoTrial && !this._hasPaidSub) {
      return this._mayCheckout();
    }
    return this._mayCheckout() && !this._hasActiveSub;
  }

  /**
   * Apply the #/desk/billing deep-link preselect (opt.plan / opt.cycle /
   * opt.tab, validated here). This only SEEDS existing state — a panel opened
   * without these keys is left exactly as before. The checkout tab is opened
   * optimistically so the common (eligible) case paints straight into checkout;
   * _settleDeepLinkTab() steps it back down once eligibility is known, so a link
   * can never dead-end an account that cannot check out.
   *
   * @param {Object} [opt] the togglePanel opt bag
   */
  _applyDeepLink(opt) {
    if (!opt) return;
    const PLAN_KEYS = { free: 1, pro: 1, team: 1, business: 1 };
    const plan = opt.plan != null && PLAN_KEYS[String(opt.plan).toLowerCase()]
      ? String(opt.plan).toLowerCase()
      : null;
    const c = opt.cycle != null ? String(opt.cycle).toLowerCase() : "";
    const cycle = /^year/.test(c) ? "yearly" : (/^month/.test(c) ? "monthly" : null);
    const tab = opt.tab != null ? String(opt.tab).toLowerCase() : "";
    if (!plan && !cycle && !tab) return;

    if (cycle) {
      this.state.plansTab.cycle = cycle;
      this.state.checkout.billingCycle = cycle;
      // Keep fetchPlanData's first-paint cycle seed from overriding the link.
      this._cycleSeeded = true;
      this.state.currentTab = cycle === "yearly" ? TAB_YEARLY : TAB_MONTHLY;
    }
    if (plan) {
      this.state.plansTab.selectedPlan = plan;
      this.state.checkout.selectedPlan = plan;
    }
    // A checkout deep link needs a concrete PAID plan to buy — 'free' has no
    // checkout. Opening the tab here also keeps fetchPlanData from overwriting
    // the chosen plan (it only re-seeds the checkout form while NOT on that tab).
    if (tab === "checkout" && plan && plan !== "free") {
      this._deepLinkCheckout = true;
      this.state.currentTab = TAB_CHECKOUT;
    }
  }

  /**
   * A checkout deep link opens the tab before the subscription is known (see
   * _applyDeepLink). Once it has loaded, honour the same guard the tab bar uses:
   * an account that cannot check out (already subscribed / upgrades off) falls
   * back to the plans view on the chosen cycle instead of dead-ending. Runs at
   * most once.
   */
  _settleDeepLinkTab() {
    if (!this._deepLinkCheckout || this._deepLinkSettled) return;
    this._deepLinkSettled = true;
    if (this.state.currentTab === TAB_CHECKOUT && !this._checkoutTabAllowed()) {
      const cycle = this.state.plansTab.cycle;
      this.state.currentTab = cycle === "yearly" ? TAB_YEARLY : TAB_MONTHLY;
      this.tab = this.state.currentTab;
    }
  }

  // Human-readable consequence list for the cancel-confirm modal.
  _cancelConsequences() {
    const sub = this._subscription || {};
    const lines = [];
    if (this._isPromoTrial) {
      // LAUNCH30: no card, no renew — Cancel ends Team immediately (same
      // revert the expiry worker runs). Soft cancel-at-period-end would be a
      // no-op: the trial already stops on trial_ends_at with nothing to bill.
      lines.push(
        LOCALE.PROMO_CANCEL_IMMEDIATE
          || "Your free Team trial will end immediately. Your workspace returns to the Free plan right away — no card was ever charged.",
      );
    } else {
      const when = this._periodEnd ? Dayjs(this._periodEnd * 1000).format("MMM D, YYYY") : "";
      lines.push((LOCALE.CANCEL_KEEP_UNTIL || "You'll keep your current plan until {0}. After that your workspace returns to the Free plan (20 GB).").format(when));
    }
    // Over-the-free-limit warning (Free = 20 GB, decimal).
    const usedBytes = (Visitor.diskUsed && Visitor.diskUsed()) || 0;
    if (usedBytes > 20000000000) {
      const usedGB = Math.round(usedBytes / 1000000000);
      lines.push((LOCALE.CANCEL_OVER_LIMIT || "Your current usage ({0} GB) is over the Free 20 GB limit — you won't be able to upload new files until you free up space.").format(usedGB));
    }
    // Team seats warning — only for a real ORG/team subscription. entity_type
    // is injected by the server ('org') for team subs; the quota 'organization'
    // flag is 1 for personal Pro too, so it must NOT drive this line.
    //
    // member_count, not `seats`: the latter is the plan's member CAP copied out
    // of quota, so on Business it announced that 100000 member seats were about
    // to be removed. The count is what the owner actually loses.
    // Promo trials are always org-scoped (org_provision); use member_count
    // from the subscription_status enrichment when present, else skip.
    const seats = parseInt(sub.member_count, 10) || this._memberCount || 0;
    if ((sub.entity_type === "org" || this._isPromoTrial) && seats > 0) {
      lines.push((LOCALE.CANCEL_TEAM_SEATS || "Your team's {0} member seats will be removed and each member drops to their own Free plan.").format(seats));
    }
    return lines.join("\n\n");
  }

  // Synchronous "does the caller currently pay" signal — mirrors the quota
  // check the banner skeleton uses (subscriptionBanner) so the "Cancel plan"
  // banner button is clickable the instant it's visible. Without this, the
  // banner (now rendered from quota on the very first paint, ticket
  // 2026-07-22) showed "Cancel plan" for the ~1 round-trip _hasPaidSub is
  // still async-false, and clicking it during that window silently no-opped.
  _isPaidByQuota() {
    const plan = String(((Visitor.quota && Visitor.quota()) || {}).plan || "").toLowerCase();
    // `pro` belongs here — it is a paid tier. It was missing for the same
    // reason the promo gate above was: the plan was revived on 2026-08-03,
    // after this list was written. The skeleton's own fallback for this
    // method already counted it (skeleton/index.js paidByQuota), so the two
    // disagreed and a Pro subscriber's "Cancel plan" banner stayed inert for
    // the round-trip this method exists to cover.
    return /^(pro|team|business|sovereign|enterprise)$/.test(plan);
  }

  /**
   * Is there anything to cancel? A quota alone is not.
   *
   * `_isPaidByQuota` says the workspace HOLDS a paid tier, which is not the
   * same as holding a subscription: a plan granted by hand, and a plan whose
   * subscription was already terminated (the entitlement is kept until
   * period_end, the mirror row is not), both read as paid with nothing behind
   * them. payment.cancel_subscription answers NO_SUBSCRIPTION for those, and
   * the caller got "Something went wrong" for pressing a button that could
   * never have worked. A LAUNCH30 trial IS cancellable — through promo.cancel.
   */
  _hasCancellablePlan() {
    return !!(this._hasPaidSub || this._isPromoTrial);
  }

  async _confirmCancel() {
    if (!this._hasCancellablePlan() || this._isCanceling) return;
    if (this._isPromoTrial) return this._confirmCancelPromo();
    const ok = await Wm.confirm({
      title: LOCALE.CANCEL_SUBSCRIPTION || "Cancel subscription",
      message: this._cancelConsequences(),
      confirm: LOCALE.CANCEL_CONFIRM || "Cancel plan",
      confirm_type: "danger",
      cancel: LOCALE.KEEP_PLAN || "Keep plan",
      cancel_type: "secondary",
      mode: "hbf",
    }).then(() => true).catch(() => false);
    if (!ok) return;
    const data = await this.postService(SERVICE.payment.cancel_subscription, { hub_id: Visitor.id }).catch(() => null);
    if (!data || /FAILED|NO_SUBSCRIPTION|NOT_CONFIGURED/.test(data.status || "")) {
      if (Wm && Wm.alert) Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
      return;
    }
    // Optimistic: reflect the pending cancel immediately from the endpoint's
    // return; the webhook confirms/persists it shortly after.
    if (this._subscription) {
      this._subscription.status = "canceled";
      this._subscription.period_end = data.period_end || this._subscription.period_end;
    }
    this._periodEnd = Number(data.period_end) || this._periodEnd;
    this._isCanceling = true;
    if (typeof Butler !== "undefined" && Butler.say) Butler.say(LOCALE.SUBSCRIPTION_CANCELED_TOAST || "Your plan will be canceled at the end of the period.");
    this.fetchPlanData();
  }

  // LAUNCH30 Cancel plan — ends the free trial immediately (no Stripe).
  async _confirmCancelPromo() {
    const ok = await Wm.confirm({
      title: LOCALE.PROMO_CANCEL_TITLE || "End free trial",
      message: this._cancelConsequences(),
      confirm: LOCALE.PROMO_CANCEL_CONFIRM || "End trial",
      confirm_type: "danger",
      cancel: LOCALE.KEEP_PLAN || "Keep plan",
      cancel_type: "secondary",
      mode: "hbf",
    }).then(() => true).catch(() => false);
    if (!ok) return;
    const res = await this.postService(SERVICE.promo.cancel, { hub_id: Visitor.id }).catch(() => null);
    const data = (res && res.data) || res || {};
    const status = data.status || (res && res.status);
    if (status !== "OK") {
      if (Wm && Wm.alert) Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
      return;
    }
    this._isPromoTrial = false;
    this._hasActiveSub = false;
    this._periodEnd = 0;
    // Refresh Visitor.quota immediately so the current-plan card flips to
    // Free without waiting on the payment.plan_updated WS fan-out.
    if (typeof Visitor !== "undefined" && Visitor.respawn) {
      Visitor.respawn({ plan: "free", quota: data.quota });
    }
    if (typeof Butler !== "undefined" && Butler.say) {
      Butler.say(LOCALE.PROMO_TRIAL_ENDED_TOAST || "Your free trial has ended. You're back on the Free plan.");
    }
    await this._loadSubscription();
    if (!this.isDestroyed()) this.fetchPlanData();
  }

  async _resumeSubscription() {
    if (!this._isCanceling) return;
    const data = await this.postService(SERVICE.payment.resume_subscription, { hub_id: Visitor.id }).catch(() => null);
    if (!data || /FAILED|NO_SUBSCRIPTION|NOT_CONFIGURED/.test(data.status || "")) {
      if (Wm && Wm.alert) Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
      return;
    }
    if (this._subscription) this._subscription.status = "active";
    this._isCanceling = false;
    // Confirmation modal (Figma 3050-96691) in the desk wrapper-modal — the
    // same shell as the post-Checkout result; Done bubbles billing-result-close
    // to the window manager, which clears the wrapper.
    Kind.waitFor("settings_billing_result").then(() => {
      Wm.ensurePart("wrapper-modal").then((p) => {
        p.feed({ kind: "settings_billing_result", result: "resume", uiHandler: [Wm] });
      });
    }).catch(() => {
      if (typeof Butler !== "undefined" && Butler.say) Butler.say(LOCALE.SUBSCRIPTION_RESUMED_TOAST || "Your subscription has been resumed.");
    });
    this.fetchPlanData();
  }

  // What a downgrade actually costs the workspace, beyond the money. The
  // billing wording alone ("the unused time becomes a credit") reads as
  // harmless, while the webhook applies the lower plan's quota with no usage
  // check — an org above the target's storage or member cap is over-quota the
  // moment it lands. Same consequences the cancel flow spells out, because it
  // is the same kind of loss.
  _downgradeConsequences(targetPlan) {
    const lines = [];
    const capGB = this.storage[targetPlan] || 0;
    const capSeats = this.seats[targetPlan] || 0;
    // Org-wide usage when the server reports it. Visitor.diskUsed() is only the
    // signed-in user's share, so an org far over the target plan's allowance
    // looked fine to an owner who personally stores little — the warning never
    // fired for the case it was written for.
    const usedBytes = Number((this._subscription || {}).disk_used)
      || (Visitor.diskUsed && Visitor.diskUsed()) || 0;
    if (capGB && usedBytes > capGB * 1000000000) {
      lines.push((LOCALE.DOWNGRADE_OVER_STORAGE
        || "Your workspace uses {0} GB, over the {1} GB this plan includes — you won't be able to upload new files until you free up space.")
        .format(Math.round(usedBytes / 1000000000), capGB));
    }
    // member_count is the org's real headcount, supplied by
    // payment.subscription_status. It is NOT `seats` on that row — that is the
    // plan's member cap copied out of quota, so comparing it against the target
    // plan's cap produced "your team has 100000 members, over the 10 allowed".
    // With no real count (personal subscriptions) the warning is simply not
    // shown rather than guessed at.
    const seatsUsed = parseInt((this._subscription || {}).member_count, 10) || 0;
    if (capSeats && seatsUsed > capSeats) {
      lines.push((LOCALE.DOWNGRADE_OVER_SEATS
        || "Your team has {0} members, over the {1} this plan allows — members beyond the limit lose access.")
        .format(seatsUsed, capSeats));
    }
    // Always state the ceiling being moved to, even when today's usage fits:
    // the buyer is choosing a smaller workspace, not just a smaller bill.
    //
    // Written the way the plan cards write it. capGB/capSeats are the internal
    // sentinels (1000, 100000), so printed raw this said "1000 GB of storage
    // and up to 100000 members" where the card beside it says "1 TB" and
    // "Unlimited".
    const storageLabel = capGB >= 1000 ? `${capGB / 1000} TB` : `${capGB} GB`;
    const seatsLabel = capSeats >= 100000 ? LOCALE.UNLIMITED : `${capSeats}`;
    lines.push((LOCALE.DOWNGRADE_NEW_LIMITS
      || "This plan includes {0} of storage and up to {1} members.")
      .format(storageLabel, seatsLabel));
    return lines.join("\n\n");
  }

  // 'month' | 'year' for the cycle the plan cards are currently priced in.
  // Mirrors skeleton/index.js: plansTab.cycle when set, else the tab index.
  _selectedCycle() {
    const cycle = (this.state && this.state.plansTab && this.state.plansTab.cycle)
      || (this.state.currentTab === TAB_YEARLY ? "yearly" : "monthly");
    return /^year/.test(cycle) ? "year" : "month";
  }

  // Replacing the plan the caller already holds: warn, then send them through
  // checkout to pay for the new one.
  //
  // The alternative — swapping the price on the live subscription in place
  // (payment.change_plan) — took the prorated difference off the card on file
  // with no payment step at all; its client was removed 2026-07-29. Every
  // change goes through checkout so the buyer sees what they are paying,
  // which means the old subscription has to end: two subscriptions on one
  // customer is a double charge.
  //
  // Hence the warning. `supersede` then travels with the checkout, and the
  // webhook cancels the replaced subscription the moment the new one is paid —
  // neither half is safe without the other.
  async _confirmReplacePlan(targetPlan, targetPeriod) {
    const sub = this._subscription || {};
    // The RAW subscription plan for the cycle comparison (a legacy 'pro' row
    // maps onto 'team' for display but is a different product); the display
    // name for the copy. currentPlanName is set by the async fetchPlanData —
    // a click that beats it (the _paidPlanSync early-click path) falls back
    // to the cached quota so the popup ranks upgrade/downgrade correctly.
    const current = this.currentPlanName
      || String(Visitor.quota?.()?.plan || "").toLowerCase();
    const currentRaw = String(sub.plan || "") || current;
    const currentPeriod = /^year/.test(String(sub.period || "")) ? "year" : "month";
    const period = /^(month|year)$/.test(targetPeriod || "") ? targetPeriod : this._selectedCycle();
    const label = (p) => p === "business" ? LOCALE.BUSINESS
      : p === "team" ? LOCALE.TEAM
      : p === "pro" ? LOCALE.PRO
      : p === "sovereign" ? LOCALE.SOVEREIGN
      : LOCALE.FREE;
    const currentTitle = label(current);
    const targetTitle = label(targetPlan);
    const when = this._periodEnd ? Dayjs(this._periodEnd * 1000).format("MMM D, YYYY") : "";
    const rank = { free: 0, pro: 1, team: 2, business: 3, sovereign: 4 };

    // Three shapes for three different situations (product spec 2026-07-29):
    //  - same plan, other cycle  → DEFERRED: the current cycle runs to its
    //    paid end, the new one starts right after (server: trial_end).
    //  - other plan, other cycle → immediate replacement, copy naming both
    //    cycles so "canceled immediately" is unambiguous.
    //  - other plan, same cycle  → immediate replacement, upgrade/downgrade
    //    copy ("gain instant access" / "lose access to {plan}-only features").
    const samePlan = targetPlan === currentRaw;
    const cycleWord = (p) => (p === "year" ? (LOCALE.YEARLY || "Yearly") : (LOCALE.MONTHLY || "Monthly"));
    const per = period === "year" ? (LOCALE.PER_YEAR || "/year") : (LOCALE.PER_MONTH || "/month");
    const price = this._money(this._catPrice(targetPlan, period));

    let title;
    let message;
    let confirm_type = "danger";
    if (samePlan && period === currentPeriod) return; // already exactly this
    // A cycle change is charged like any other plan change: at checkout, now.
    // It used to be deferred — the new cycle idled on a Stripe trial until the
    // paid period lapsed — which took no money on the day and so had its own
    // copy ("Nothing is charged today"). Product moved it back to charging
    // immediately, so it falls through to the shared immediate wording below,
    // which already names both cycles and says the remaining time is not
    // carried over.
    if (period !== currentPeriod) {
      const lines = [
        (LOCALE.PLAN_SWITCH_NOW_MSG
          || "Switch to the {0} {1} plan for {2}{3}?\n\nYour current {4} {5} subscription will be canceled immediately, and any remaining subscription time will not be carried over. Your {0} {1} plan will start right away.")
          .format(targetTitle, cycleWord(period), price, per, currentTitle, cycleWord(currentPeriod)),
      ];
      if ((rank[targetPlan] ?? 0) < (rank[current] ?? 0)) {
        lines.push(this._downgradeConsequences(targetPlan));
      }
      title = (LOCALE.PLAN_SWITCH_CYCLE_TITLE || "Switch to {0} {1}")
        .format(targetTitle, cycleWord(period));
      message = lines.filter(Boolean).join("\n\n");
    } else {
      // Same cycle, different plan (product copy 2026-07-29). Both prices are
      // quoted — "for $X/month or $Y/year" — because the plan card the user
      // clicked sells the plan, not a cycle; the checkout tab still lets them
      // pick either before paying.
      const down = (rank[targetPlan] ?? 0) < (rank[current] ?? 0);
      const mPrice = this._money(this._catPrice(targetPlan, "month"));
      const yPrice = this._money(this._catPrice(targetPlan, "year"));
      if (down) {
        title = (LOCALE.PLAN_DOWNGRADE_TITLE || "Downgrade to {0}").format(targetTitle);
        message = [
          (LOCALE.PLAN_DOWNGRADE_MSG
            || "Switch to the {0} plan for {1}/month or {2}/year?\n\nYour {3} plan will be canceled immediately, and any remaining subscription time will not be carried over. You'll immediately switch to the {0} plan and lose access to {3}-only features.")
            .format(targetTitle, mPrice, yPrice, currentTitle),
          this._downgradeConsequences(targetPlan),
        ].filter(Boolean).join("\n\n");
      } else {
        title = (LOCALE.PLAN_UPGRADE_TITLE || "Upgrade to {0}").format(targetTitle);
        message = (LOCALE.PLAN_UPGRADE_MSG
          || "Switch your subscription to {0} at {1}/month or {2}/year?\n\nYour {3} plan will be canceled immediately, and any remaining subscription time will not be carried over. You'll gain instant access to all {0} plan features.")
          .format(targetTitle, mPrice, yPrice, currentTitle);
      }
    }

    const ok = await Wm.confirm({
      title,
      message,
      confirm: LOCALE.PLAN_REPLACE_CONFIRM || "Continue to payment",
      ...(confirm_type ? { confirm_type } : {}),
      cancel: LOCALE.CANCEL || "Cancel",
      cancel_type: "secondary",
      mode: "hbf",
    }).then(() => true).catch(() => false);
    if (!ok) return;

    // Carry the intent into checkout: _proceedToCheckout reads it and the
    // server lifts the already-subscribed refusal only for this case. The
    // cycle the caller accepted presets the checkout selector.
    this.state.checkout.supersede = 1;
    this.state.checkout.billingCycle = period === "year" ? "yearly" : "monthly";
    this._enterCheckoutFor(targetPlan);
  }

  // _confirmPlanChange (the payment.change_plan client — an in-place price
  // swap that billed the card on file with NO payment step) was removed
  // 2026-07-29: product decided every plan change goes through checkout, so
  // the user always sees and confirms the charge. The server endpoint stays
  // for the Billing Portal, but nothing in this widget calls it any more.

  /**
   * Return view mode for widget
   * @returns {string} Grid view mode
   */
  getViewMode() {
    return _a.grid;
  }

  /**
   * Re-initialize UI when DOM is refreshed
   */
  async onDomRefresh() {
    // Reflect the mount mode to the DOM so the skin can style each context:
    //  data-popup="1" → constrained centred card (legacy popup mounts).
    //  data-page="1"  → full-page scroll layout inside settings-main-slot.
    if (this._popup && this.el) this.el.dataset.popup = "1";
    if (this._page && this.el) this.el.dataset.page = "1";
    if (this.state.currentTab === undefined || this.state.currentTab === null) {
      this.state.currentTab = TAB_MONTHLY;
    }
    this.tab = this.state.currentTab;
    // Render immediately with Visitor.quota()'s cached plan/seats/storage and
    // the hardcoded fallback catalog prices — was two sequential awaited
    // fetches (catalog, then subscription) BEFORE the first feed(), so the
    // whole screen sat blank for both round-trips back to back. First paint
    // no longer waits on the network at all; the catalog/subscription fetch
    // below re-renders in place once it lands.
    this.fetchPlanData();
    // Catalog (live Stripe prices) and subscription mirror (status,
    // period_end, seats — also computes the pending-cancel banner flags) are
    // independent reads; fetch them concurrently instead of one after the
    // other and re-render once both are in.
    const [catalog] = await Promise.all([
      this.fetchService(SERVICE.payment.catalog, { hub_id: Visitor.id })
        .then((d) => (d && d.plans) || null)
        .catch(() => null),
      this._loadSubscription(),
    ]);
    this._catalog = catalog;
    // The subscription is now loaded, so checkout eligibility is knowable:
    // settle any checkout deep link (stepping down to the plans view if this
    // account can't buy) before the render below.
    this._settleDeepLinkTab();
    // LAUNCH30 (design doc 2026-07-30) trigger B: "Opens Billing page".
    // Self-gated server-side (SERVICE.promo.get_state) — safe to call
    // unconditionally on every mount, including a re-render after tab focus.
    // The returned state is reused by the skeleton's claimPill(): once the
    // full modal has been seen anywhere (any surface) but not claimed, this
    // page keeps a small persistent reminder instead of re-showing the
    // modal (tester feedback 2026-07-31 #3) — one fetch, two callers.
    this._promoState = null;
    if (typeof Desk !== "undefined" && Desk && Desk._maybeShowPromoLaunch30) {
      this._promoState = (await Desk._maybeShowPromoLaunch30("billing")) || null;
    }
    // Re-sync the subscription when the tab regains focus — covers a return
    // from the Stripe Billing Portal (a full-page redirect back to the desk
    // root, so this widget re-mounts) and any change made in another tab.
    if (!this._onVisibility) {
      this._onVisibility = () => {
        if (document.visibilityState === "visible" && !this.isDestroyed()) {
          this._loadSubscription().then(() => { if (!this.isDestroyed()) this.fetchPlanData(); });
        }
      };
      document.addEventListener("visibilitychange", this._onVisibility);
    }
    return this.fetchPlanData();
  }

  /**
   * Get current plan from Visitor.quota() and update state
   * Quota structure: {plan: 'free', organization: 0, seat: 0, storage: 20000000000}
   * @returns {Promise} Promise that resolves when plan data is processed and UI is updated
   */
  fetchPlanData() {
    try {
      // Quota carries the entitlement figures (seats, storage, cycle).
      let { total_seat, plan = "free", billing_cycle = "monthly", storage } = Visitor.quota() || {}
      // ...but NOT the authoritative plan name. Visitor.quota() is a client
      // cache refreshed only when the payment.plan_updated WS event lands and
      // calls Visitor.respawn. The subscription mirror, by contrast, is read
      // straight from the server by _loadSubscription.
      //
      // Reading the plan from the cache made a plan change appear to undo
      // itself: the WS re-sync repainted from the still-stale CACHE and put
      // the old plan back — server said business, the page said team. Prefer
      // the mirror whenever
      // there is a live subscription row; quota stays the source for everyone
      // else (a free account has no mirror row at all).
      const mirrored = String((this._subscription || {}).plan || "");
      const planName = (mirrored || plan || "free").toLowerCase();
      if (mirrored) {
        const p = String((this._subscription || {}).period || "");
        if (/^year/.test(p)) billing_cycle = "yearly";
        else if (/^month/.test(p)) billing_cycle = "monthly";
      }
      // Get period from plan_detail if available, default to monthly

      // Normalise quota.plan onto a card key. 'pro' is FIRST-CLASS again
      // (2026-08-03 revival — the $5 personal tier); only the legacy
      // hand-granted 'Drumee Plus' free-text name still reads as Team (the
      // 2026-07-24 patch rewrote those rows, this is belt-and-braces for a
      // straggler). Default is 'free', not a paid tier: an unknown name must
      // never imply an entitlement.
      let mappedPlan = "free";
      if (planName === "pro") {
        mappedPlan = "pro";
      } else if (/^(team|drumee plus)$/.test(planName)) {
        mappedPlan = "team";
      } else if (planName === "business") {
        mappedPlan = "business";
      } else if (planName === "sovereign" || planName === "enterprise") {
        mappedPlan = "sovereign";
      }

      // Get seat from quota

      // Get storage from quota (in bytes, convert to GB)
      // 1 GB = 1,000,000,000 bytes (decimal)
      const storageBytes = storage || 0;
      let storageGB = Math.floor(storageBytes / 1000000000);
      // If plan is free, set storage to 20GB (fixed, not editable)
      if (mappedPlan === "free") {
        storageGB = 20;
      }
      // 'month'/'monthly' => monthly; 'year'/'yearly' => yearly. (The old
      // /^moth/ typo never matched, so checkout always pre-selected yearly.)
      billing_cycle = /^month/i.test(billing_cycle || "") ? "monthly" : (/^year/i.test(billing_cycle || "") ? "yearly" : "monthly");
      // Seed the checkout form from the CURRENT plan — but ONLY while the user
      // isn't already in the checkout tab. fetchPlanData re-runs on every
      // subscription re-sync (the initial load's slow ~5s round-trip, a
      // payment.plan_updated WS event, a visibilitychange), and each run used
      // to overwrite the checkout selection with the current plan. So a Team
      // owner who clicked "Choose Pro" → confirm → checkout would, ~5s later,
      // have selectedPlan silently reverted from 'pro' back to 'team': the
      // payment form flips to their existing plan and the switch is lost
      // (QA: "clicking checkout bounces back to subscription management"). The
      // user's active checkout selection must win over a background re-sync.
      if (this.state.currentTab !== TAB_CHECKOUT) {
        this.state.checkout.selectedPlan = mappedPlan;
        this.state.checkout.billingCycle = billing_cycle;
        this.state.checkout.seats = total_seat || 0;
        this.state.checkout.storage = storageGB;
        // Open the plans view on the cycle the caller actually pays on. The
        // tab defaulted to Monthly regardless, so a yearly subscriber landed on
        // a view where — now that "current" means plan AND cycle — no card was
        // marked as theirs and their own plan's CTA read "Switch to Monthly
        // billing", offering to move them off the cycle they had chosen. Only
        // on the FIRST paint: after that the tab is the user's own choice.
        if (!this._cycleSeeded && this._hasPaidSub) {
          this._cycleSeeded = true;
          this.state.plansTab.cycle = billing_cycle;
          const cycleTab = billing_cycle === "yearly" ? TAB_YEARLY : TAB_MONTHLY;
          this.state.currentTab = cycleTab;
          this.tab = cycleTab;
        }
      }
      // Store plan data for reference
      this.currentPlan = {
        plan: planName,
        period: billing_cycle,
      };
      this._currentSubsType = billing_cycle;
      this.currentPlanName = mappedPlan;
      this.calculateCheckoutSummary()
      return this.feed(require("./skeleton").default(this));
    } catch (e) {
      this.warn("fetchPlanData got error", e)
      // Fallback: render with default state
      return this.feed(require("./skeleton").default(this));
    }
  }

  /**
   * Callback when a UI element is ready
   * Setup listeners for input fields and cache references
   * @param {Object} child - Child widget instance
   * @param {string} pn - Part name identifier
   */
  onPartReady(child, pn) {
    switch (pn) {
      case `${this.fig.family}__content`:
        this.__content = child;
        break;
      case `${this.fig.family}__tabs-trigger`:
        this.__tabsTrigger = child;
        break;
      case `${this.fig.family}__checkout-right-panel`:
        this.__rightPanel = child;
        break;
      case `${this.fig.family}__checkout-seats-input`:
        // this._setupInputChangeListener(child, "seats");
        // this._restoreInputFocus(child, "seats");
        this.__seatsInput = child;
        break;
      case `${this.fig.family}__checkout-org-name-input`:
        this.__orgNameInput = child;
        break;
      case `${this.fig.family}__checkout-org-ident-input`:
        this.__orgIdentInput = child;
        break;
      case `${this.fig.family}__checkout-promo-code-input`:
        this.__promoCodeInput = child;
        break;
      case `${this.fig.family}__redeem-code-input`:
        this.__redeemCodeInput = child;
        break;
        // case `${this.fig.family}__checkout-storage-input`:
        //   this._setupInputChangeListener(child, "storage");
        //   this._restoreInputFocus(child, "storage");
        //   this.__storageInput = child;
    }
  }

  /**
   * Restore focus and cursor position for input field after re-render
   * @param {Object} entryWidget - Entry widget instance
   * @param {string} fieldName - Field name (seats or storage)
   */
  // _restoreInputFocus(entryWidget, fieldName) {
  //   if (!this._focusedInput || this._focusedInput.fieldName !== fieldName) {
  //     return;
  //   }
  //   if (!entryWidget || !entryWidget._id) return;

  //   const inputId = `${entryWidget._id}-input`;

  //   this.waitElement(inputId, () => {
  //     const inputEl = document.getElementById(inputId);
  //     if (!inputEl) return;

  //     if (this._focusedInput.value !== undefined) {
  //       inputEl.value = this._focusedInput.value;
  //     }

  //     if (this._focusedInput.cursorPosition !== undefined) {
  //       inputEl.focus();
  //       inputEl.setSelectionRange(
  //         this._focusedInput.cursorPosition,
  //         this._focusedInput.cursorPosition
  //       );
  //     }

  //     this._focusedInput = null;
  //   });
  // }

  /**
   * Setup event listeners for input field to update state when user types
   * @param {Object} entryWidget - Entry widget instance
   * @param {string} fieldName - Field name (seats or storage)
   */
  // _setupInputChangeListener(entryWidget, fieldName) {
  //   if (!entryWidget || !entryWidget._id) return;

  //   const inputId = `${entryWidget._id}-input`;

  //   this.waitElement(inputId, () => {
  //     const inputEl = document.getElementById(inputId);
  //     if (!inputEl) return;

  //     const handleChange = () => {
  //       const value = inputEl.value;
  //       let numValue = parseInt(value);

  //       if (value === "" || isNaN(numValue)) {
  //         numValue = fieldName === "storage" ? 0 : 5;
  //       }
  //       if (numValue >= 0) {
  //         this.state.checkout[fieldName] = numValue;

  //         if (this.state.currentTab === TAB_CHECKOUT) {
  //           const cursorPosition = inputEl.selectionStart;
  //           this._focusedInput = {
  //             fieldName,
  //             cursorPosition,
  //             value: inputEl.value,
  //             el: inputEl
  //           };
  //           this.renderContent(inputEl);
  //         }
  //       }
  //     };

  //     inputEl.addEventListener("change", handleChange);
  //     inputEl.addEventListener("input", handleChange);

  //     entryWidget.once("destroy", () => {
  //       inputEl.removeEventListener("change", handleChange);
  //       inputEl.removeEventListener("input", handleChange);
  //     });
  //   });
  // }

  /**
   * Update right panel (checkout summary) with latest data
   * Only update if currently on checkout tab
   */
  updateRightPanel() {
    if (this.state.currentTab !== TAB_CHECKOUT) {
      return;
    }

    if (!this.__rightPanel) {
      this.ensurePart(`${this.fig.family}__checkout-right-panel`)
        .then((panel) => {
          if (panel) {
            this.__rightPanel = panel;
            this._updateRightPanelContent();
          }
        })
        .catch(() => { });
      return;
    }

    this._updateRightPanelContent();
  }

  /**
   * Re-render right panel content with latest summary
   */
  _updateRightPanelContent() {
    if (!this.__rightPanel) {
      return;
    }

    const { rightPanelContent } = require("./skeleton/checkout");

    if (typeof this.__rightPanel.softClear === "function") {
      this.__rightPanel.softClear();
    }

    this.__rightPanel.feed(rightPanelContent(this));
  }

  /**
   * Calculate checkout summary based on current state
   * Includes: base price, bundle price, total price, storage, effective price per seat
   * @param {Object} state - Component state
   * @returns {Object} Summary object with formatted values
   */
  /**
   * May this caller reach checkout? One answer for the plan cards, the
   * select-plan handler and anything else that offers to start a purchase.
   *
   * The SERVER decides ownership: it resolves the payer through
   * organisation.owner_id, which the client cannot see. The client only knows
   * the domain permission bit, and a member can hold `owner` on the domain
   * without being the owner_id row — that mismatch is what let a non-owner
   * walk to the pay step and get ORG_IDENT_REQUIRED. Until the verdict arrives
   * we fall back to the local rule so the first paint is not wrong in the
   * common case.
   * @returns {boolean}
   */
  _mayCheckout() {
    // Does this deployment sell plans at all — nothing overrides that.
    if (!billingAvailable()) return false;
    if (this._canBuy === false) return false;
    if (this._canBuy === true) return true;
    return canUpgradePlan();
  }

  calculateCheckoutSummary() {
    let state = this.state;
    const checkout = state?.checkout || {};
    const selectedPlan = checkout.selectedPlan || "team";
    const billingCycle = checkout.billingCycle || "monthly";

    const baseStorage = this.storage[selectedPlan];
    const baseSeats = this.seats[selectedPlan];
    if (selectedPlan == "free") {
      return {
        seats: `${baseSeats}`,
        selectedPlan,
        storage: `${baseStorage}`,
        billingCycle,
        totalPrice: formatCurrency(0),
        period: "month",
        basePrice: formatCurrency(0),
        totalStorage: `${baseStorage}`,
      }
    }

    // Prices come from the server catalog (Stripe is the truth); fall back to
    // the published figures only if the catalog didn't load.
    const catPrice = (code, cycle) => {
      const period = cycle === "yearly" ? "year" : "month";
      const row = (this._catalog || []).find((p) => p.plan_code === code && p.period === period);
      return row && row.amount != null ? Number(row.amount) / 100 : null;
    };
    const planPrices = {
      // Yearly is 10 x monthly — two months free (product decision
      // 2026-07-29). The catalog above is the truth; these are offline
      // fallbacks only.
      free: { monthly: 0, yearly: 0 },
      pro: { monthly: catPrice("pro", "monthly") ?? 5, yearly: catPrice("pro", "yearly") ?? 50 },
      team: { monthly: catPrice("team", "monthly") ?? 29, yearly: catPrice("team", "yearly") ?? 290 },
      business: { monthly: catPrice("business", "monthly") ?? 99, yearly: catPrice("business", "yearly") ?? 990 },
    };

    const basePrice = planPrices[selectedPlan]?.[billingCycle] || 0;
    const period = billingCycle === "yearly" ? "year" : "month";

    // FLAT since the 2026-07 pricing rebuild: the plan price IS the total, and
    // the storage/seat figures come straight from the plan. The storage
    // bundles (storage_*) and extra-seat (pro_seat) catalog rows that used to
    // be added on top are retired with the B2C Pro tier, and `seats` is the
    // plan's member CAP now, not a quantity the buyer picks — so there is
    // nothing left to accumulate here.
    //
    // The zeroed bundle/extra-seat fields are kept in the returned shape on
    // purpose: skeleton/checkout.js still reads them, and dropping the keys
    // would render "undefined" rather than simply nothing.
    // Display, not arithmetic. Business's caps are sentinels chosen so code
    // reading them as numbers behaves (see this.seats/this.storage): printing
    // them raw put "Included seats 100000", "1000 GB" and an
    // "Effective price per seat $0.00" in front of the buyer. Say what the
    // published table says instead — Unlimited members, 1 TB — and drop the
    // per-seat line where a per-seat price is not a thing.
    const seats = baseSeats;
    const unlimitedSeats = seats >= 100000;

    // Applied MKT promo code (payment.preview_coupon). percent_off comes off
    // the recurring price; trial_days is a free period BEFORE the first
    // charge, so it does not change the amount — it is surfaced as a note.
    // Preview only: Stripe recomputes the real invoice at checkout.
    const promo = checkout.promo || null;
    const pct = promo ? (parseInt(promo.percent_off, 10) || 0) : 0;
    const discountAmount = pct > 0 ? (basePrice * pct) / 100 : 0;
    const finalPrice = Math.max(0, basePrice - discountAmount);

    return {
      basePrice: formatCurrency(basePrice),
      bundlePrice: formatCurrency(0),
      totalPrice: formatCurrency(finalPrice),
      // Only set when a discount actually applies, so the skeleton can show
      // the struck-through original without a special case for "no promo".
      originalPrice: discountAmount > 0 ? formatCurrency(basePrice) : "",
      discountAmount: discountAmount > 0 ? formatCurrency(discountAmount) : "",
      promo,
      period,
      seats: unlimitedSeats ? LOCALE.UNLIMITED : `${seats}`,
      totalStorage: baseStorage >= 1000
        ? `${baseStorage / 1000} TB`
        : `${baseStorage} GB`,
      effectivePricePerSeat: unlimitedSeats
        ? ""
        : formatCurrency(seats > 0 ? finalPrice / seats : finalPrice),
      selectedPlan,
      billingCycle,
      extraSeats: 0,
      bundleStorage: 0,
    };
  }


  /**
   * Display price (in currency units) for a plan/period from the server
   * catalog (Stripe is the truth); falls back to the previous literals so
   * the cards never render blank if the catalog didn't load.
   * @param {string} code - plan code ('pro' | 'team')
   * @param {string} period - 'month' | 'year'
   * @returns {number} amount in currency units
   */
  // Is this plan actually purchasable HERE — a catalog row with a Stripe price?
  // Price ids are seeded per environment (sandbox and live are separate Stripe
  // accounts and their ids are not portable), so a plan can be in the catalog
  // with no price. Offering its CTA anyway dead-ends on NO_PRICE, which the
  // client can only report as a generic failure — after the buyer has confirmed
  // a priced dialog. The catalog is the authority; the hardcoded fallbacks
  // below exist to keep the ladder readable, not to promise a sale.
  _catSellable(code) {
    // Until the catalog lands, assume the tiers that were sellable before it
    // did — a blank first paint must not hide the CTA from everyone.
    if (!this._catalog) return /^(pro|team|business)$/.test(code);
    return (this._catalog || []).some(
      (p) => p.plan_code === code && p.stripe_price_id
    );
  }

  _catPrice(code, period) {
    const row = (this._catalog || []).find(
      (p) => p.plan_code === code && p.period === period
    );
    if (row && row.amount != null) return Number(row.amount) / 100;
    // Offline fallbacks only — the catalog above is the truth. Yearly is
    // 10 x monthly — two months free (product decision 2026-07-29).
    //
    // `pro` belongs here again. This map was written when Pro was retired,
    // and the 2026-08-03 revival added the plan everywhere except this
    // fallback — so on any deployment whose catalog is not seeded with Stripe
    // price ids, Pro alone priced at zero while Team and Business read
    // correctly off their entries. It is not caught by the `?? 5` in the plan
    // card either: this returns 0, and `??` only falls back on null.
    const fb = {
      pro: { month: 5, year: 50 },
      team: { month: 29, year: 290 },
      business: { month: 99, year: 990 },
    };
    return (fb[code] && fb[code][period]) || 0;
  }

  /**
   * Format a number as a display price. Mirrors formatCurrency so the
   * skeleton modules (which can't see the module-scoped helper) can reuse it.
   * @param {number} n
   * @returns {string}
   */
  _money(n) {
    return formatCurrency(Number(n) || 0);
  }

  /**
   * Handle proceed to checkout: call payment API and open payment window
   */
  // Auto organization name for the org bootstrap: "<user's name> Workspace".
  // Pre-fills the checkout org-name input and backs the submit fallback, so
  // starting an org plan never blocks on an empty field. It used to append the
  // plan name ("… Team"), which named the workspace after a subscription tier
  // — wrong the moment Business became purchasable, and wrong again the day
  // the org changes plan.
  _defaultOrgName() {
    const raw = String(
      `${Visitor.get(_a.firstname) || ""} ${Visitor.get(_a.lastname) || ""}`.trim()
      || Visitor.get(_a.fullname)
      || Visitor.get(_a.username)
      || "",
    ).trim();
    // An email-signup account with no profile name carries the address itself
    // as fullname — "user@host.com Workspace" is not a workspace name. Keep
    // the local part only.
    const name = raw.includes("@") ? raw.split("@")[0] : raw;
    return name ? `${name} ${LOCALE.WORKSPACE || "Workspace"}` : "";
  }

  // Auto subdomain suggestion: the username slugged down to a DNS label
  // (lowercase alnum + inner dashes, max 63) — same shape validate_org_ident
  // accepts. The user can still type their own; collisions surface via the
  // existing server-side validation.
  _defaultOrgIdent() {
    return String(Visitor.get(_a.username) || "")
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 63)
      .replace(/-+$/g, "");
  }

  // Map an org-ident validation status to its user-facing message.
  /**
   * Open the user's mail client addressed to sales.
   *
   * The sales-led plans have no checkout to enter, so their CTA has to hand
   * the conversation over. It used to show the address in an alert, which left
   * the user to copy it out by hand to do the very thing the button offered.
   * The subject carries the plan so the enquiry arrives already identified.
   *
   * mailto is opened via location.assign rather than window.open: a popup
   * blocker silently swallows the latter when the click has already been
   * through a confirm dialog, and the user is left thinking nothing happened.
   */
  _openSalesMail(plan) {
    const to = LOCALE.SALES_CONTACT_EMAIL || "contact@drumee.org";
    const planName = String(plan || "").replace(/^./, (c) => c.toUpperCase());
    const subject = (LOCALE.MAIL_SALES_SUBJECT || "Drumee {0} plan enquiry")
      .format(planName);
    // mailto: NEVER throws — a machine with no mail client just does
    // nothing, silently (reported 2026-07-29: "click ... không mở email").
    // The only observable difference is focus: a mail app taking over blurs
    // this window. Fire the mailto, and if we still own the focus a moment
    // later, show the address instead so the path is never a dead end.
    let handed_off = false;
    const onBlur = () => { handed_off = true; };
    try { window.addEventListener("blur", onBlur, { once: true }); } catch (e) { /* old UA */ }
    try {
      window.location.assign(
        `mailto:${to}?subject=${encodeURIComponent(subject)}`
      );
    } catch (e) { /* fall through to the address fallback */ }
    setTimeout(() => {
      try { window.removeEventListener("blur", onBlur); } catch (e) { /* noop */ }
      if (handed_off || document.visibilityState === "hidden") return;
      if (Wm && Wm.alert) {
        Wm.alert(
          (LOCALE.CONTACT_SALES_VIA || "Please contact our sales team via {0}")
            .format(to)
        );
      }
    }, 1200);
  }

  // `data` is the whole checkout response, optional — only
  // COUPON_PLAN_MISMATCH needs it (to name the plan the code is locked to).
  _orgIdentError(status, data = {}) {
    // Inside an organisation these two stop meaning what they say and start
    // meaning "you are not this org's BILLING owner".
    //
    // The server resolves the payer through organisation.owner_id, while the
    // client only knows the domain permission bit — a member can hold `owner`
    // on the domain and still not be the owner_id row. For them the checkout
    // answers ORG_IDENT_REQUIRED (payment_get_org found no org they own) or,
    // once a bootstrap is supplied, ALREADY_IN_OTHER_DOMAIN (the
    // move-semantics guard refuses a second org). Reporting those verbatim
    // told the user to fill in an org name and subdomain — fields that are
    // only rendered for a personal account (domain_id <= 1), so the advice was
    // impossible to act on. Say who can actually do it instead.
    const inOrg = ~~Visitor.get("domain_id") > 1;
    if (inOrg && (status === "ORG_IDENT_REQUIRED" || status === "ALREADY_IN_OTHER_DOMAIN")) {
      return LOCALE.NOT_ORG_OWNER;
    }
    switch (status) {
      case "IDENT_INVALID": return LOCALE.ORG_IDENT_INVALID;
      case "IDENT_NOT_AVAILABLE": return LOCALE.ORG_IDENT_TAKEN;
      case "ALREADY_IN_OTHER_DOMAIN": return LOCALE.ORG_ALREADY_IN_DOMAIN;
      case "ORG_IDENT_REQUIRED": return LOCALE.ORG_IDENT_REQUIRED;
      case "CODE_NOT_FOUND":
      case "COUPON_INVALID":
        return LOCALE.PROMO_CODE_INVALID || "This promo code is not valid.";
      case "CODE_INACTIVE":
        return LOCALE.PROMO_CODE_INACTIVE || "This promo code is no longer active.";
      case "CODE_EXPIRED":
        return LOCALE.PROMO_CODE_EXPIRED || "This promo code has expired.";
      case "CODE_EXHAUSTED":
        return LOCALE.PROMO_CODE_EXHAUSTED || "This promo code has reached its usage limit.";
      case "EMAIL_ALREADY_USED":
        return LOCALE.PROMO_CODE_EMAIL_USED
          || "This email has already used a partner promo code.";
      case "COUPON_WITH_ACTIVE_SUB":
        return LOCALE.PROMO_CODE_ACTIVE_SUB
          || "Promo codes apply to new paid subscriptions only.";
      case "PROMO_WITH_DEFER":
        return LOCALE.PROMO_CODE_WITH_DEFER
          || "Promo codes cannot be combined with a deferred billing-cycle switch.";
      case "COUPON_PLAN_UNSUPPORTED":
        return LOCALE.PROMO_CODE_PLAN
          || "This promo code applies to paid plans only.";
      // Code is targeted at ONE plan and this is not it. Naming that plan
      // turns a dead end into an instruction — the user can switch to it.
      case "COUPON_PLAN_MISMATCH": {
        const scope = String(data && data.plan_scope || "").trim();
        if (!scope) {
          return LOCALE.PROMO_CODE_PLAN
            || "This promo code applies to paid plans only.";
        }
        const named = scope.charAt(0).toUpperCase() + scope.slice(1);
        return (LOCALE.PROMO_CODE_PLAN_ONLY
          || "This promo code can only be used on the {0} plan.").format(named);
      }
      case "COUPON_STRIPE_FAILED":
      case "OFFER_INVALID":
      case "ARGS_INVALID":
      case "COUPON_EMAIL_REQUIRED":
        return LOCALE.PROMO_CODE_FAILED
          || "Could not apply this promo code. Please try again.";
      default: return LOCALE.SOMETHING_WENT_WRONG;
    }
  }

  /**
   * Drop a previewed promo. keepCode=true clears the applied offer but leaves
   * the typed string so Remove → retype is not needed; false also wipes the
   * field (plan change).
   */
  _clearPromoPreview(keepCode) {
    const checkout = this.state.checkout || (this.state.checkout = {});
    delete checkout.promo;
    delete checkout.promoError;
    if (!keepCode) checkout.promoCode = "";
  }

  /**
   * Apply (preview) the typed partner code against payment.preview_coupon.
   * Updates the right-panel total without reserving a redemption — the real
   * reserve still happens on Proceed to Checkout.
   */
  async _applyPromoCode() {
    const checkout = this.state.checkout || (this.state.checkout = {});
    const code = String(
      (this.__promoCodeInput && this.__promoCodeInput.getValue
        && this.__promoCodeInput.getValue())
      || checkout.promoCode || "",
    ).trim();
    checkout.promoCode = code;
    delete checkout.promo;
    delete checkout.promoError;

    if (!code) {
      checkout.promoError = LOCALE.PROMO_CODE_INVALID
        || "This promo code is not valid.";
      this.updateRightPanel();
      return;
    }

    // Couponable plans, mirroring the server (payment.preview_coupon and
    // payment.checkout both test /^(pro|team|business)$/). Pro was left out
    // when it was revived on 2026-08-03: the server and the procs were
    // updated for it, this gate was not, so an all-plans code typed on a Pro
    // checkout was refused HERE and never reached preview_coupon.
    //
    // This list is about which plans can be BOUGHT with a code at all — the
    // per-code targeting is plan_scope, and only the server may judge it
    // (mkt_coupon_validate/reserve/redeem all enforce it). Answering
    // COUPON_PLAN_MISMATCH locally would guess at data we do not hold.
    const plan = checkout.selectedPlan || "team";
    if (!/^(pro|team|business)$/.test(plan)) {
      checkout.promoError = LOCALE.PROMO_CODE_PLAN
        || "This promo code applies to paid plans only.";
      this.updateRightPanel();
      return;
    }

    const res = await this.postService(SERVICE.payment.preview_coupon, {
      promo_code: code,
      plan,
      hub_id: Visitor.id,
    }).catch(() => null);

    const data = res || {};
    if (data.status && data.status !== "OK") {
      checkout.promoError = this._orgIdentError(data.status, data);
      this.updateRightPanel();
      return;
    }
    if (!data.code) {
      checkout.promoError = LOCALE.PROMO_CODE_FAILED
        || "Could not apply this promo code. Please try again.";
      this.updateRightPanel();
      return;
    }

    checkout.promo = {
      code: data.code,
      partner: data.partner || "",
      kind: data.kind || "",
      plan_scope: data.plan_scope || "all",
      percent_off: parseInt(data.percent_off, 10) || 0,
      trial_days: parseInt(data.trial_days, 10) || 0,
      duration_months: parseInt(data.duration_months, 10) || 0,
    };
    checkout.promoCode = data.code;
    this.updateRightPanel();
  }

  // True when the caller currently pays for a PERSONAL Pro subscription (so
  // moving to Team replaces it). Guards the upgrade-confirm popup. Uses the
  // synchronous quota plan as the primary signal — _hasPaidSub is filled
  // asynchronously by _loadSubscription() and may still be false on an early
  // click. NB: the quota `organization` flag is 1 for personal Pro TOO, so it
  // can't distinguish an org — use domain_id (org owners are on a domain > 1;
  // a personal Pro is on the default domain 1), matching the same
  // domain_id <= 1 gate the org-bootstrap checkout uses.

  // True when the caller is on ANY paid plan per the cached quota — the
  // synchronous stand-in for _hasActiveSub while _loadSubscription() is still
  // in flight. Guards the switch-confirm popup on the very first click: an
  // early click used to read _hasActiveSub=undefined and walk a Business org
  // owner straight into a Pro checkout with no warning — Stripe charged the
  // $5, the org subscription kept running, and the plan display never changed
  // (live case, prod 2026-08-06). Quota is a superset of "has a Stripe sub"
  // (a LAUNCH30 org is paid-by-quota with no sub), which errs on the side of
  // showing the confirm popup — the safe direction.
  _paidPlanSync() {
    const quota = Visitor.quota?.() || {};
    return /^(pro|team|business|sovereign)$/.test(String(quota.plan || "").toLowerCase());
  }

  // Switch to the in-app checkout tab pre-selected on a plan. Shared by the
  // plan-card CTAs so the Team confirm-popup path and the direct paths render
  // identically.
  _enterCheckoutFor(planValue) {
    this.state.checkout.selectedPlan = planValue;
    this.state.currentTab = TAB_CHECKOUT;
    this.tab = TAB_CHECKOUT;
    this.renderContent();
  }

  async _proceedToCheckout() {
    // The SERVER decides the price (Stripe price_id from yp.plan); the client
    // only declares WHAT to buy. plan 'team' => org (per-seat) checkout.
    const checkout = this.state.checkout || {};
    const plan = checkout.selectedPlan || "team";
    // Team and Business are both ORGANISATION plans (yp.plan entity_type
    // 'org'), so 'org' is the only paid entity_type that reaches checkout.
    // Sending 'user' for business would trip the server's
    // PLAN_ENTITY_MISMATCH refusal.
    const entity_type = plan === "team" || plan === "business" ? "org" : "user";
    const period = checkout.billingCycle === "yearly" ? "year" : "month";
    // No seats, no bundle. Every plan is flat since the 2026-07 rebuild: Team
    // is $29 for 100 GB and up to 10 members, so the seat count is a cap, not
    // a purchased quantity — the server sends quantity 1 and would multiply
    // the bill if we passed a seat total. The storage bundles and the
    // extra-seat add-on are retired along with the B2C Pro tier.
    // hub_id is REQUIRED: payment.checkout is ACL scope:hub/src:owner. Without it
    // the server falls back to the host hub (where the caller isn't owner) and
    // returns 403 PERMISSION_DENIED. Send the caller's own hub so the owner
    // check resolves correctly (verified: missing hub_id -> 403, present -> 200).
    const payload = { hub_id: Visitor.id, entity_type, plan, period };
    // Set by _confirmReplacePlan after the caller accepted losing their current
    // plan. Without it the server refuses a live subscriber, which is the guard
    // against an accidental second subscription.
    if (checkout.supersede) {
      const sub = this._subscription || {};
      const curPlan = String(sub.plan || "");
      const curPeriod = /^year/.test(String(sub.period || "")) ? "year" : "month";
      // The checkout tab lets the caller flip plan and cycle after the popup,
      // so the intent is derived HERE, from what is actually being bought:
      //  - the exact subscription they already hold → nothing to buy (without
      //    this, supersede would waive the server's ALREADY_SUBSCRIBED refusal
      //    and mint a duplicate);
      //  - anything else (other plan, or the same plan on the other cycle) →
      //    immediate replacement, charged at checkout.
      if (plan === curPlan && period === curPeriod) {
        if (Wm && Wm.alert) Wm.alert(LOCALE.ALREADY_SUBSCRIBED);
        return;
      }
      payload.supersede = 1;
    }
    // TEAM bootstrap: the payer is still on the default domain — the org
    // name + subdomain were collected in the checkout form; validate the
    // ident server-side BEFORE the Stripe redirect (product decision: prompt
    // before checkout; the webhook provisions the org after payment).
    if (entity_type === "org" && ~~Visitor.get("domain_id") <= 1) {
      // Auto-derived defaults back the pre-filled inputs, so a cleared field
      // falls back instead of blocking the plan change with ORG_IDENT_REQUIRED.
      const org_name = String((this.__orgNameInput && this.__orgNameInput.getValue()) || "").trim()
        || this._defaultOrgName();
      const ident = (String((this.__orgIdentInput && this.__orgIdentInput.getValue()) || "").trim().toLowerCase()
        || this._defaultOrgIdent());
      // Keep the typed values across checkout re-renders (plan/cycle switch).
      checkout.orgName = org_name;
      checkout.orgIdent = ident;
      if (!org_name || !ident) {
        if (Wm && Wm.alert) Wm.alert(LOCALE.ORG_IDENT_REQUIRED);
        return;
      }
      const v = await this.postService(SERVICE.payment.validate_org_ident, {
        hub_id: Visitor.id,
        ident,
      }).catch(() => null);
      if (!v || v.status !== "OK") {
        if (Wm && Wm.alert) Wm.alert(this._orgIdentError(v && v.status));
        return;
      }
      payload.ident = v.ident;
      payload.org_name = org_name;
    }
    // Optional MKT outreach partner code (Iris/Theo…). Empty = no coupon.
    // Prefer the Applied preview code so a disabled field / stale input
    // cannot silently drop the offer the shopper just confirmed in the UI.
    const promo_code = String(
      (checkout.promo && checkout.promo.code)
      || (this.__promoCodeInput && this.__promoCodeInput.getValue
        && this.__promoCodeInput.getValue())
      || (checkout.promoCode) || "",
    ).trim();
    if (promo_code) {
      checkout.promoCode = promo_code;
      payload.promo_code = promo_code;
    }
    this.postService(SERVICE.payment.checkout, payload)
      .then((data) => {
        const { url, status } = data || {};
        if (url) { window.location.assign(url); return; } // full-page redirect to hosted Checkout
        // The server refuses a purchase while a subscription is live. Say what
        // actually applies instead of the generic failure: nothing to buy, or
        // resume. Re-sync so the tab and the banner reflect the subscription
        // the server just told us about. USE_SUBSCRIPTION_UPDATE means a live
        // subscriber reached checkout WITHOUT the supersede confirmation (a
        // deep link or a stale render — the plan cards always confirm first):
        // route them into the same warning + checkout flow instead of the
        // removed in-place swap, which changed the plan with no payment step.
        if (status === "ALREADY_SUBSCRIBED" ||
            status === "USE_SUBSCRIPTION_UPDATE" ||
            status === "SUBSCRIPTION_PAST_DUE" ||
            status === "PENDING_CANCEL_RESUME_INSTEAD") {
          if (status !== "USE_SUBSCRIPTION_UPDATE" && Wm && Wm.alert) {
            Wm.alert(
              status === "ALREADY_SUBSCRIBED" ? LOCALE.ALREADY_SUBSCRIBED
              : status === "SUBSCRIPTION_PAST_DUE" ? LOCALE.SUBSCRIPTION_PAST_DUE
              : LOCALE.RESUME_INSTEAD_OF_BUYING);
          }
          this._loadSubscription().then(() => {
            if (this.isDestroyed && this.isDestroyed()) return;
            this.state.currentTab = TAB_MONTHLY;
            this.tab = TAB_MONTHLY;
            this.renderContent();
            // Carry the cycle the checkout form was on so "Team yearly"
            // doesn't silently become a no-op.
            if (status === "USE_SUBSCRIPTION_UPDATE") {
              this._confirmReplacePlan(plan, period);
            }
          });
          return;
        }
        if (status === "NOT_ORG_OWNER" && Wm && Wm.alert) Wm.alert(LOCALE.NOT_ORG_OWNER);
        else if (status && status !== "OK" && Wm && Wm.alert) Wm.alert(this._orgIdentError(status, data));
      })
      .catch((e) => {
        this.warn("Got backend error [_proceedToCheckout]:", e);
        if (Wm && Wm.alert) {
          Wm.alert(LOCALE.SOMETHING_WENT_WRONG || "Something went wrong. Please try again.");
        }
      });
  }

  /**
   * Get position/tab index from command object
   * Search from multiple sources: model, mget/get, dataset, DOM element
   * @param {Object} cmd - Command object from UI event
   * @returns {number|null} Tab position or null
   */
  getSelectPlanData(cmd) {
    let pos = null;

    if (cmd.model) {
      pos =
        cmd.model.get(_a.pos) ||
        cmd.model.get(_a.value) ||
        cmd.model.get("pos") ||
        cmd.model.get("value");
    }

    if (pos == null) {
      pos =
        (cmd.mget && cmd.mget(_a.pos)) ||
        (cmd.get && cmd.get(_a.pos)) ||
        (cmd.mget && cmd.mget(_a.value)) ||
        (cmd.get && cmd.get(_a.value));
    }

    if (pos == null) {
      pos = cmd.pos || cmd.value;
    }

    if (pos == null && cmd.el) {
      pos = cmd.el.dataset?.pos || cmd.el.dataset?.value;
    }

    if (pos == null && cmd.el) {
      pos =
        cmd.el.getAttribute?.("data-pos") ||
        cmd.el.getAttribute?.("data-value");
    }

    if (pos == null && cmd.el) {
      let parent = cmd.el.closest?.(`.${this.fig.family}__tabs-trigger-item`);
      if (parent) {
        const parentContainer = parent.parentElement;
        if (parentContainer) {
          const children = Array.from(parentContainer.children);
          const index = children.indexOf(parent);
          if (index !== -1 && index < TAB_CHECKOUT) {
            pos = index;
          }
        }
      }
    }

    if (pos == null && cmd.el) {
      // Last-resort text match against the CURRENT locale labels (the old
      // English literals broke tab detection on non-English locales).
      const text = (cmd.el.textContent || cmd.el.innerText || "").toLowerCase();
      const monthly = (LOCALE.MONTHLY || "monthly").toLowerCase();
      const yearly = (LOCALE.YEARLY || "yearly").toLowerCase();
      if (text && text.includes(monthly)) {
        pos = TAB_MONTHLY;
      } else if (text && text.includes(yearly)) {
        pos = TAB_YEARLY;
      }
    }

    return pos;
  }

  /**
   * Handle when user selects plan tab (Monthly/Yearly)
   * Update state and re-render content
   * @param {Object} cmd - Command object from UI event
   * @returns {boolean} false to stop event bubbling
   */
  handleSelectPlan(cmd) {
    const pos = this.getSelectPlanData(cmd);

    if (pos != null && pos !== undefined) {
      const posNum = parseInt(pos);
      if (!isNaN(posNum) && (posNum === TAB_MONTHLY || posNum === TAB_YEARLY)) {
        if (posNum !== this.state.currentTab) {
          this.state.currentTab = posNum;
          this.state.plansTab.cycle =
            posNum === TAB_MONTHLY ? "monthly" : "yearly";
          this.tab = posNum;
          this.renderContent();
        }
      }
    }
    return false;
  }

  /**
   * Helper: Get value from cmd or args
   * Search from model, mget/get, or args.value
   * @param {Object} cmd - Command object
   * @param {Object} args - Arguments object
   * @returns {*} Value or null
   */
  _getValueFromCmd(cmd, args) {
    if (!cmd && !args) return null;

    let value = null;

    if (cmd && cmd.model) {
      value = cmd.model.get(_a.value) || cmd.model.get("value");
    }

    if (value == null && cmd) {
      value =
        (cmd.mget && cmd.mget(_a.value)) ||
        (cmd.get && cmd.get(_a.value)) ||
        cmd.value;
    }

    if (value == null && args) {
      value = args.value;
    }

    return value;
  }

  /**
   * Helper: Get name from cmd
   * Search from model, mget/get, or cmd.name
   * @param {Object} cmd - Command object
   * @returns {string|null} Name or null
   */
  _getNameFromCmd(cmd) {
    if (!cmd) return null;

    let name = null;

    if (cmd.model) {
      name = cmd.model.get(_a.name) || cmd.model.get("name");
    }

    if (name == null) {
      name =
        (cmd.mget && cmd.mget(_a.name)) ||
        (cmd.get && cmd.get(_a.name)) ||
        cmd.name;
    }

    return name;
  }

  /**
   * Helper: Get input value from multiple sources
   * Search from _input.val(), getValue(), DOM element, args, or model
   * @param {Object} cmd - Command object
   * @param {string} field - Field name
   * @param {Object} args - Arguments object
   * @returns {*} Value or null
   */
  _getInputValue(cmd, field, args) {
    if (!cmd && !args) return null;

    let value = null;

    if (cmd && cmd._input && typeof cmd._input.val === "function") {
      value = cmd._input.val();
    } else if (cmd && typeof cmd.getValue === "function") {
      value = cmd.getValue();
    } else if (cmd && cmd._id) {
      const inputEl = document.getElementById(`${cmd._id}-input`);
      if (inputEl) {
        value = inputEl.value;
      }
    }

    if (value == null && args && field && args[field] != null) {
      value = args[field];
    }

    if (value == null && args && args.value != null) {
      value = args.value;
    }

    if (value == null && cmd && cmd.model) {
      value = cmd.model.get(_a.value) || cmd.model.get("value");
    }

    if (value == null && cmd) {
      value =
        (cmd.mget && cmd.mget(_a.value)) ||
        (cmd.get && cmd.get(_a.value)) ||
        cmd.value;
    }

    return value;
  }

  /**
   * Helper: Determine field name from service name
   * Map service "update-seats"/"seats" -> "seats", "update-storage"/"storage" -> "storage"
   * @param {string} service - Service name
   * @param {Object} cmd - Command object (to get name if service is _a.input)
   * @returns {string|null} Field name or null
   */
  _getFieldFromService(service, cmd) {
    if (["update-seats", "input-seats", "seats"].includes(service)) {
      return "seats";
    }

    if (["update-storage", "storage"].includes(service)) {
      return "storage";
    }

    if (service === _a.input && cmd) {
      const cmdName = this._getNameFromCmd(cmd);
      if (cmdName === "seats" || cmdName === "storage") {
        return cmdName;
      }
    }

    return null;
  }

  /**
   * Handle when user selects storage bundle
   * Validate bundle value and update state
   * @param {Object} cmd - Command object
   * @param {Object} args - Arguments object
   * @returns {boolean} false to stop event bubbling
   */
  _handleSelectBundle(cmd, args) {
    const bundle = this._getValueFromCmd(cmd, args);

    if (!bundle || !["100", "200", "500", "1000"].includes(String(bundle))) {
      return false;
    }

    const bundleValue = String(bundle);
    const previousBundle = this.state.checkout.selectedBundle;

    if (previousBundle !== bundleValue) {
      this.state.checkout.selectedBundle = bundleValue;
      this.renderContent();
    }

    return false;
  }

  /**
   * Handle when user changes input field (seats or storage)
   * Validate value and update state, then update right panel
   * @param {Object} cmd - Command object
   * @param {Object} args - Arguments object
   * @param {string} service - Service name
   * @returns {boolean} false to stop event bubbling
   */
  _handleInputField(cmd, args, service) {
    // Block input when plan is free
    if (this.state?.checkout?.selectedPlan === "free") {
      return false;
    }

    const field = this._getFieldFromService(service, cmd);
    if (!field) {
      return false;
    }

    const value = this._getInputValue(cmd, field, args);

    if (value == null || value === undefined) {
      return false;
    }

    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 0) {
      return false;
    }

    this.state.checkout[field] = numValue;
    this.updateRightPanel();

    return false;
  }

  /**
   * Re-render entire content based on currentTab
   * Includes header tabs and corresponding content (plans or checkout)
   * Restore input focus if currently on checkout tab
   */
  renderContent() {
    if (
      this.state.currentTab === undefined ||
      this.state.currentTab === null ||
      isNaN(this.state.currentTab)
    ) {
      this.state.currentTab = TAB_MONTHLY;
    }
    if (
      this.state.currentTab < TAB_MONTHLY ||
      this.state.currentTab > TAB_CHECKOUT
    ) {
      this.state.currentTab = TAB_MONTHLY;
    }

    this.tab = this.state.currentTab;

    if (!this.__tabsTrigger || !this.__content) {
      this.feed(require("./skeleton").default(this));
      return;
    }

    const header = require("./skeleton/header").default(this);
    this.__tabsTrigger.feed(header);

    const { getContent } = require("./skeleton");
    const content = getContent(this);

    if (this.__content && typeof this.__content.softClear === "function") {
      this.__content.softClear();
    }

    this.__content.feed(content);

    if (this._focusedInput && this.state.currentTab === TAB_CHECKOUT) {
      const focusedField = this._focusedInput.fieldName;
      const sysPn = `${this.fig.family}__checkout-${focusedField}-input`;

      this.ensurePart(sysPn)
        .then((entryWidget) => {
          if (entryWidget) {
            this._restoreInputFocus(entryWidget, focusedField);
          }
        })
        .catch(() => { });
    }
  }

  /**
   * Handle all UI events from user interactions
   * Route events to corresponding handler methods
   * @param {Object} cmd - Command object
   * @param {Object} args - Arguments object
   * @returns {boolean} false to stop bubbling or super.onUiEvent result
   */
  onUiEvent(cmd, args = {}) {
    let service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "select-plan":
        // Switching to the plans view abandons a replacement in progress, so
        // the flag cannot leak into an unrelated purchase later.
        if (this.state.checkout) delete this.state.checkout.supersede;
        return this.handleSelectPlan(cmd);

      case "select-plan-button": {
        const planValue = this._getValueFromCmd(cmd, args);
        // Sovereign stays sales-led — it is a self-hosted deployment, not a
        // Stripe product, so there is no checkout to enter. ('enterprise' is
        // the retired name for the same idea, matched so a stale card cannot
        // fall through.) Business became self-serve with the July 2026 final
        // pricing table: it checks out like Team when nothing is live, and
        // switches the existing subscription in place otherwise.
        if (/^(sovereign|enterprise)$/.test(planValue)) {
          // Hand the conversation over instead of reciting the address: open
          // the mail client with the plan already in the subject.
          this._openSalesMail(planValue);
        } else if (!this._mayCheckout()) {
          // Defense in depth behind the disabled card CTA: a stale render or a
          // deep link must not reach a checkout that can only dead-end.
          if (Wm && Wm.alert) Wm.alert(LOCALE.ONLY_OWNER_CAN_CHANGE_PLAN);
        } else if (planValue === "free") {
          // Free is the floor: reaching it from a paid plan is a CANCEL, not a
          // purchase. Sending it to checkout asked the user to "buy" a $0 plan
          // they already fall back to, and on the server that is a NO_PRICE
          // dead end. With no subscription there is simply nothing to do.
          if (this._hasCancellablePlan()) this._confirmCancel();
        } else if (/^(pro|team|business)$/.test(planValue)) {
          // A live subscription means the click is a plan SWITCH: warn
          // (supersede) and route through checkout — the buyer always sees
          // and confirms the charge. With nothing live it is a normal
          // checkout.
          //
          // The card shows the price for the cycle the Monthly/Yearly tab is
          // on, so that cycle is part of what was clicked — pass it through
          // rather than silently keeping the old one and charging a price the
          // card never displayed.
          // _hasActiveSub is filled by the async _loadSubscription(); on a
          // click that beats it, fall back to the cached quota so a paying
          // caller still gets the switch warning instead of a raw checkout
          // that would mint a second subscription (see _paidPlanSync).
          if (this._hasActiveSub || (!this._subLoaded && this._paidPlanSync())) {
            this._confirmReplacePlan(planValue, this._selectedCycle());
          } else if (this._checkoutTabAllowed()) {
            this._enterCheckoutFor(planValue);
          }
        }
        return false;
      }
      case "storage-changes":
        this.state.checkout.storage = args.value;
        this._updateRightPanelContent()
        break;
      case "seats-changes":
        this.state.checkout.seats = args.value;
        this._updateRightPanelContent()
        break;
      case "checkout":
        // The tab is not rendered while a subscription is live, but a stale
        // render or a queued click can still land here -- refuse rather than
        // walking into a checkout the server will reject.
        if (!this._checkoutTabAllowed()) return false;
        if (this.state.currentTab !== TAB_CHECKOUT) {
          this.state.currentTab = TAB_CHECKOUT;
          this.tab = TAB_CHECKOUT;
          this.renderContent();
        }
        return false;

      case "select-checkout-plan":
        const plan = this._getValueFromCmd(cmd, args);
        if (/^(free|pro|team|business)$/.test(plan)) {
          // Storage and seats are fixed per plan now (flat pricing), so they
          // are read straight off the plan rather than nudged per branch.
          this.state.checkout.selectedPlan = plan;
          this.state.checkout.storage = this.storage[plan] || 0;
          this.state.checkout.seats = this.seats[plan] || 0;
          // Plan-scoped codes may no longer match — drop the preview so the
          // shopper re-Applies against the plan they are actually buying.
          this._clearPromoPreview(false);
          this.renderContent();
        }
        return false;

      case "select-billing-cycle":
        const cycle = this._getValueFromCmd(cmd, args);
        if (cycle === "monthly" || cycle === "yearly") {
          this.state.checkout.billingCycle = cycle;
          // Keep the applied promo — percent_off still applies; only the
          // catalog base changes. Re-render so the discounted total updates.
          this.renderContent();
        }
        return false;

      case "apply-promo-code":
        this._applyPromoCode();
        return false;

      case "remove-promo-code":
        this._clearPromoPreview(true);
        this.updateRightPanel();
        return false;

      case "select-bundle":
        return this._handleSelectBundle(cmd, args);

      case "input-seats":
        if (/^(Backspace|)$/.test(cmd.status)) {
          return
        }
      case "update-seats":
      case "update-storage":
      case "storage":
      case _a.input:
        return this._handleInputField(cmd, args, service);

      case "proceed-checkout-billing":
        // Block checkout when plan is free
        if (this.state?.checkout?.selectedPlan === "free") {
          return false;
        }
        this._proceedToCheckout();
        return false;

      case "cancel-subscription":
        // Native in-app cancel: confirm + consequences, then cancel at period
        // end via SERVICE.payment.cancel_subscription (keeps access until then).
        this._confirmCancel();
        return false;

      case "resume-subscription":
        // Undo a scheduled cancellation.
        this._resumeSubscription();
        return false;

      case "manage-billing":
        // Open the Stripe Billing Portal (hosted invoices/cancel/resume/card).
        // hub_id REQUIRED for the scope:hub/owner ACL (see _proceedToCheckout).
        this.postService(SERVICE.payment.portal, { hub_id: Visitor.id })
          .then((data) => {
            const { url, status } = data || {};
            if (url) window.location.assign(url);
            else if (Wm && Wm.alert) Wm.alert(LOCALE.NO_ACTIVE_SUBSCRIPTION);
          })
          .catch(() => {
            if (Wm && Wm.alert) Wm.alert(LOCALE.SOMETHING_WENT_WRONG);
          });
        return false;

      case "billing-close":
        // Close the popup. settings_billing is mounted in settings_main's
        // overlay (uiHandler:[settings_main]); bubble up so the host clears
        // the overlay. triggerHandlers resolves the live handler at fire time.
        this.triggerHandlers({ service: "billing-close" });
        return false;

      case "promo-pill-claim":
        // Re-open the full offer (Modal A) from the persistent reminder
        // pill — a deliberate re-entry the user asked for, so it bypasses
        // the eligible_unseen gate in Desk._maybeShowPromoLaunch30 (which
        // only auto-shows the FIRST time) and launches directly.
        this._reopenPromoOffer();
        return false;

      case "promo-pill-dismiss":
        // Hides the card for THIS page view only — the offer itself is
        // already "seen" (server-side) and stays live here until claimed
        // or the campaign ends (design doc), so there is no server call:
        // the next visit to this page re-renders the card.
        this._promoPillDismissed = true;
        this.feed(require("./skeleton").default(this));
        return false;

      case "redeem-toggle": {
        const st = this.state.redeem || (this.state.redeem = {});
        st.open = !st.open;
        // Collapsing is also how you dismiss a failed attempt — carrying the
        // old error back into a freshly reopened form would read as if the
        // new code had already been rejected.
        if (!st.open) delete st.error;
        this.feed(require("./skeleton").default(this));
        return false;
      }

      case "redeem-select-plan": {
        const st = this.state.redeem || (this.state.redeem = {});
        st.plan = cmd.mget(_a.value) || cmd.mget("value") || "team";
        // A plan-locked code rejected for the previous plan may be fine for
        // this one — drop the stale verdict rather than leaving it under a
        // selection it no longer describes.
        delete st.error;
        delete st.success;
        this.feed(require("./skeleton").default(this));
        return false;
      }

      case "redeem-code":
        this._redeemCode();
        return false;

    }
  }

  /**
   * Redeem a free-period partner code straight into a plan (promo.redeem) —
   * no Stripe Checkout, no card. The server grants the entitlement and the
   * expiry worker reverts it when the free period lapses.
   *
   * A code carrying a DISCOUNT is refused here (COUPON_NOT_REDEEMABLE):
   * there is money to collect, so it belongs on the checkout tab. That case
   * gets its own message pointing there rather than a flat failure.
   */
  async _redeemCode() {
    const st = this.state.redeem || (this.state.redeem = {});
    const code = String(
      (this.__redeemCodeInput && this.__redeemCodeInput.getValue
        && this.__redeemCodeInput.getValue())
      || st.code || "",
    ).trim();
    st.code = code;
    delete st.error;
    delete st.success;

    if (!code) {
      st.error = LOCALE.PROMO_CODE_INVALID || "This promo code is not valid.";
      this.feed(require("./skeleton").default(this));
      return;
    }

    st.busy = true;
    this.feed(require("./skeleton").default(this));

    const res = await this.postService(SERVICE.promo.redeem, {
      hub_id: Visitor.id,
      promo_code: code,
      plan: st.plan || "team",
    }).catch(() => null);

    st.busy = false;
    const data = res || {};

    if (!data.status || data.status !== "OK") {
      st.error = data.status === "COUPON_NOT_REDEEMABLE"
        ? (LOCALE.REDEEM_CODE_NEEDS_CHECKOUT
          || "This code is a discount — enter it on the Checkout tab instead.")
        : this._orgIdentError(data.status, data);
      this.feed(require("./skeleton").default(this));
      return;
    }

    // Entitlement is live: refresh the cached plan so the page (and the
    // sidebar's Admin Console gate) stop showing Free, then re-render.
    try {
      if (data.quota && Visitor.respawn) {
        Visitor.respawn({ plan: data.plan, quota: data.quota });
      }
    } catch (e) { /* best-effort — the reload below still corrects it */ }

    // The LAUNCH30 pill was fetched once at render and is now wrong: the
    // server's _isEligible() already refuses a caller who has left domain 1
    // or holds a non-free plan, both of which just became true. Without
    // this the page keeps offering a free month the caller can no longer
    // claim until they reload.
    this._promoState = null;

    const until = data.trial_ends_at
      ? Dayjs.unix(data.trial_ends_at).format("MMM D, YYYY")
      : "";
    st.success = until
      ? (LOCALE.REDEEM_CODE_OK_DATED
        || "Code {0} applied — your {1} plan runs until {2}.").format(
        data.code, data.plan, until)
      : (LOCALE.REDEEM_CODE_OK || "Code {0} applied.").format(data.code);
    st.code = "";

    await this._loadSubscription().catch(() => null);
    if (!this.isDestroyed()) this.fetchPlanData();
  }

  /**
   * See onUiEvent "promo-pill-claim" above.
   */
  async _reopenPromoOffer() {
    const promo = this._promoState;
    if (!promo) return;
    try {
      await Kind.waitFor("promo_launch30");
    } catch (e) {
      return;
    }
    Wm.launch({
      kind: "promo_launch30",
      surface: "billing",
      state: "offer",
      position: promo.position,
      campaign_ends_at: promo.campaign_ends_at,
      hub_id: Visitor.id,
      wm_unique_id: "promo_launch30",
    }, { explicit: 1, singleton: 1 });
  }
}

module.exports = settings_billing;
