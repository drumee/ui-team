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
      team: 100,
      business: 1000
    }
    this.seats = {
      free: 0,
      team: 10,
      business: 100000
    }

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
    if (this._planSyncTimer) {
      clearTimeout(this._planSyncTimer);
      this._planSyncTimer = null;
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
  async _loadSubscription() {
    const raw = await this.fetchService(SERVICE.payment.subscription_status, { hub_id: Visitor.id })
      .catch(() => null);
    // Read the server's checkout verdict BEFORE the row is discarded below. A
    // caller with no subscription still gets a can_buy answer, and that is
    // exactly the case that used to walk into a dead end.
    this._canBuy = raw && typeof raw.can_buy === "boolean" ? raw.can_buy : null;
    this._subscription = raw && raw.subscription_id ? raw : null;
    const sub = this._subscription;
    const now = Math.floor(Date.now() / 1000);
    this._periodEnd = (sub && Number(sub.period_end)) || 0;
    // Pending cancel = mirror status 'canceled' with the paid period still in
    // the future (access retained until period_end). Distinct from a terminated
    // sub, whose row is gone.
    this._isCanceling = !!(sub && sub.status === "canceled" && this._periodEnd > now);
    this._hasPaidSub = !!(sub && sub.subscription_id);
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
    return this._mayCheckout() && !this._hasActiveSub;
  }

  // Human-readable consequence list for the cancel-confirm modal.
  _cancelConsequences() {
    const sub = this._subscription || {};
    const lines = [];
    const when = this._periodEnd ? Dayjs(this._periodEnd * 1000).format("MMM D, YYYY") : "";
    lines.push((LOCALE.CANCEL_KEEP_UNTIL || "You'll keep your current plan until {0}. After that your workspace returns to the Free plan (20 GB).").format(when));
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
    const seats = parseInt(sub.member_count, 10) || 0;
    if (sub.entity_type === "org" && seats > 0) {
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
    return /^(team|business|sovereign|enterprise)$/.test(plan);
  }

  async _confirmCancel() {
    if ((!this._hasPaidSub && !this._isPaidByQuota()) || this._isCanceling) return;
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
    lines.push((LOCALE.DOWNGRADE_NEW_LIMITS
      || "This plan includes {0} GB of storage and up to {1} members.")
      .format(capGB, capSeats));
    return lines.join("\n\n");
  }

  // 'month' | 'year' for the cycle the plan cards are currently priced in.
  // Mirrors skeleton/index.js: plansTab.cycle when set, else the tab index.
  _selectedCycle() {
    const cycle = (this.state && this.state.plansTab && this.state.plansTab.cycle)
      || (this.state.currentTab === TAB_YEARLY ? "yearly" : "monthly");
    return /^year/.test(cycle) ? "year" : "month";
  }

  // Switch the LIVE subscription to another plan and/or billing cycle after an
  // explicit confirm. This is the client of payment.change_plan: a price swap
  // on the existing Stripe subscription — never a second checkout, which the
  // server refuses to protect against double-billing.
  //
  // targetPeriod is the cycle the caller CHOSE ('month'|'year'); it defaults to
  // the current one. It has to be a parameter: the server answers
  // USE_SUBSCRIPTION_UPDATE for a cycle switch as well as a plan switch, and
  // deriving the period from the current subscription there silently dropped
  // the very change the user had just configured.
  async _confirmPlanChange(targetPlan, targetPeriod) {
    const sub = this._subscription || {};
    const current = /^year/.test(String(sub.period || "")) ? "year" : "month";
    const period = /^(month|year)$/.test(targetPeriod || "") ? targetPeriod : current;
    const price = this._money(this._catPrice(targetPlan, period));
    const per = period === "year" ? LOCALE.PER_YEAR : LOCALE.PER_MONTH;
    const planTitle = targetPlan === "business" ? LOCALE.BUSINESS : LOCALE.TEAM;
    // The RAW subscription plan, not the display mapping. fetchPlanData maps
    // the retired 'pro'/'drumee plus' rows onto 'team' so the cards mark the
    // right one current, but a pro holder clicking Team is changing plan, not
    // rhythm — reading currentPlanName here told them "Switch to Monthly
    // billing" for a move between two different products.
    const currentPlan = String(sub.plan || "") || this.currentPlanName || "";
    // Three shapes, because they are three different decisions: same plan on a
    // different rhythm, a bigger plan, a smaller one. Calling a cycle switch
    // "Downgrade to Team" (which is what deriving up/down from the plan name
    // alone did) describes something that isn't happening.
    const cycleOnly = targetPlan === currentPlan;
    const up = !cycleOnly && targetPlan === "business";
    let title;
    let message;
    if (cycleOnly) {
      title = (LOCALE.PLAN_CHANGE_TITLE_CYCLE || "Switch to {0} billing")
        .format(period === "year" ? LOCALE.YEARLY : LOCALE.MONTHLY);
      message = (LOCALE.PLAN_CHANGE_CONFIRM_CYCLE
        || "Bill {0} at {1}{2} from today? The unused time on your current cycle is credited against it.")
        .format(period === "year" ? LOCALE.YEARLY : LOCALE.MONTHLY, price, per);
    } else if (up) {
      title = (LOCALE.PLAN_CHANGE_TITLE_UPGRADE || "Upgrade to {0}").format(planTitle);
      message = (LOCALE.PLAN_CHANGE_CONFIRM_UPGRADE
        || "Switch your subscription to {0} at {1}{2}? The unused time on your current plan is credited and the difference is charged now.")
        .format(planTitle, price, per);
    } else {
      title = (LOCALE.PLAN_CHANGE_TITLE_DOWNGRADE || "Downgrade to {0}").format(planTitle);
      message = [
        (LOCALE.PLAN_CHANGE_CONFIRM_DOWNGRADE
          || "Switch your subscription to {0} at {1}{2}? The unused time on your current plan becomes a credit on your next payments.")
          .format(planTitle, price, per),
        this._downgradeConsequences(targetPlan),
      ].filter(Boolean).join("\n\n");
    }
    const ok = await Wm.confirm({
      title,
      message,
      confirm: LOCALE.CONFIRM || "Confirm",
      ...(up || cycleOnly ? {} : { confirm_type: "danger" }),
      cancel: LOCALE.CANCEL || "Cancel",
      cancel_type: "secondary",
      mode: "hbf",
    }).then(() => true).catch(() => false);
    if (!ok) return;
    const data = await this.postService(SERVICE.payment.change_plan, {
      hub_id: Visitor.id, plan: targetPlan, period,
    }).catch(() => null);
    const status = (data && data.status) || "";
    if (status === "NOTHING_TO_CHANGE") {
      // The subscription is already exactly this. Claiming success here (the
      // first cut did) told users a switch had happened when nothing had.
      if (Wm && Wm.alert) Wm.alert(LOCALE.ALREADY_SUBSCRIBED);
      this._loadSubscription().then(() => {
        if (this.isDestroyed && this.isDestroyed()) return;
        this.fetchPlanData();
      });
      return;
    }
    if (status === "PLAN_ENTITY_MISMATCH") {
      // This subscription's entity kind cannot hold the target plan — a legacy
      // personal Pro reaching for an org plan. It is not a dead end: checkout()
      // admits exactly this case as a supersede purchase, and the webhook ends
      // the old subscription once the new one is paid. Take them there rather
      // than naming a tab that is hidden while a subscription is live.
      if (Wm && Wm.alert) Wm.alert(LOCALE.PLAN_SWITCH_VIA_CHECKOUT);
      this._enterCheckoutFor(targetPlan);
      return;
    }
    if (status !== "OK") {
      if (Wm && Wm.alert) {
        Wm.alert(
          // The bank wants the cardholder: retrying changes nothing, so say
          // what does — a different card, via Manage billing.
          status === "PAYMENT_ACTION_REQUIRED" ? LOCALE.PAYMENT_ACTION_REQUIRED
            : status === "NO_SUBSCRIPTION" ? LOCALE.NO_ACTIVE_SUBSCRIPTION
            : LOCALE.SOMETHING_WENT_WRONG);
      }
      return;
    }
    // Optimistic flip from the endpoint's return; the webhook then re-mirrors
    // the subscription and re-applies quota (Visitor.quota catches up via the
    // payment.plan_updated WS refresh / the next re-sync).
    if (this._subscription) {
      this._subscription.plan = data.plan || targetPlan;
      this._subscription.period = data.period || period;
      this._subscription.status = data.subscription_status || "active";
      this._subscription.period_end = data.period_end || this._subscription.period_end;
    }
    this._isCanceling = false;
    this._hasActiveSub = true;
    this.currentPlanName = targetPlan;
    if (typeof Butler !== "undefined" && Butler.say) {
      Butler.say(cycleOnly
        ? (LOCALE.CYCLE_CHANGE_DONE || "Your billing cycle has been updated.")
        : (LOCALE.PLAN_CHANGE_DONE || "Your subscription is now on the {0} plan.").format(planTitle));
    }
    // Repaint from the optimistic state NOW, converge on the server LATER.
    // fetchPlanData recomputes currentPlanName from Visitor.quota(), and the
    // subscription mirror is rewritten by the webhook — both still carry the
    // OLD plan until that webhook lands, so repainting from them would flip
    // the cards back to the plan the user just left.
    this.renderContent();
    this._awaitPlanSync(targetPlan, period);
  }

  // Wait for the webhook to catch up, then repaint from server truth.
  //
  // A single fixed delay was wrong in both directions: too early and it
  // overwrites the (newer) optimistic state with pre-webhook data; too late
  // and the screen sits on an unverified claim. Poll the mirror instead and
  // repaint when it agrees — or when the attempts run out, so a webhook that
  // never arrives still reconciles rather than leaving the UI asserting a
  // change forever. The WS payment.plan_updated handler does the same repaint
  // and usually wins the race; this is the fallback for a missed event.
  _awaitPlanSync(expected, expectedPeriod, tries = 10) {
    // A generation counter, because clearTimeout only cancels a PENDING timer:
    // once the callback has fired it is awaiting the fetch, and a second plan
    // change started in that window would be silently dropped by the first
    // chain's recursion. Whoever bumps the counter last owns the poll.
    const gen = (this._planSyncGen = (this._planSyncGen || 0) + 1);
    if (this._planSyncTimer) clearTimeout(this._planSyncTimer);
    this._planSyncTimer = setTimeout(() => {
      this._planSyncTimer = null;
      if (this.isDestroyed && this.isDestroyed()) return;
      this._loadSubscription().then(() => {
        if (this.isDestroyed && this.isDestroyed()) return;
        if (gen !== this._planSyncGen) return; // superseded by a newer change
        const sub = this._subscription || {};
        // Period as well as plan: a month<->year switch leaves the plan
        // unchanged, so matching on the plan alone declared victory on the
        // first poll and repainted from the still-stale mirror — exactly the
        // revert this method exists to avoid.
        const planOk = String(sub.plan || "") === expected;
        const periodOk = !expectedPeriod
          || (/^year/.test(String(sub.period || "")) ? "year" : "month") === expectedPeriod;
        if ((planOk && periodOk) || tries <= 1) {
          this.fetchPlanData();
          return;
        }
        this._awaitPlanSync(expected, expectedPeriod, tries - 1);
      });
    }, 3000);
  }

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
      // Get current plan from Visitor.quota()
      // Structure: {plan: 'free', organization: 0, seat: 0, storage: 20000000000}
      let { total_seat, plan = "free", billing_cycle = "monthly", storage } = Visitor.quota() || {}
      // Get plan name from quota.plan (primary source)
      const planName = (plan || "free").toLowerCase();
      // Get period from plan_detail if available, default to monthly

      // Normalise quota.plan onto a card key. Legacy hand-granted rows carry
      // free-text names from before the Stripe catalog — 'Pro', 'Drumee Plus'
      // — and the retired B2C 'pro' tier; the schemas patch moves all of them
      // onto the Team entitlement, so they must READ as Team here too, or the
      // banner and the current-plan marking would point at a plan that no
      // longer exists. Default is 'free', not 'pro': an unknown name must
      // never imply a paid tier.
      let mappedPlan = "free";
      if (/^(team|pro|drumee plus)$/.test(planName)) {
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
        // case `${this.fig.family}__checkout-storage-input`:
        //   this._setupInputChangeListener(child, "storage");
        //   this._restoreInputFocus(child, "storage");
        //   this.__storageInput = child;
        break;
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
      // Yearly is 11 x monthly (one month free). Only team has a Stripe price
      // to read; business is sales-led, so its figure is the published one.
      free: { monthly: 0, yearly: 0 },
      team: { monthly: catPrice("team", "monthly") ?? 29, yearly: catPrice("team", "yearly") ?? 319 },
      business: { monthly: catPrice("business", "monthly") ?? 99, yearly: catPrice("business", "yearly") ?? 1089 },
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
    return {
      basePrice: formatCurrency(basePrice),
      bundlePrice: formatCurrency(0),
      totalPrice: formatCurrency(basePrice),
      period,
      seats: unlimitedSeats ? LOCALE.UNLIMITED : `${seats}`,
      totalStorage: baseStorage >= 1000
        ? `${baseStorage / 1000} TB`
        : `${baseStorage} GB`,
      effectivePricePerSeat: unlimitedSeats
        ? ""
        : formatCurrency(seats > 0 ? basePrice / seats : basePrice),
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
    if (!this._catalog) return code === "team" || code === "business";
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
    // 11 x monthly (one month free). Business is sales-led so it never has a
    // Stripe row; its figure is the published one. The retired B2C entries
    // (pro, pro_seat, storage_*) are gone with the plans themselves.
    const fb = {
      team: { month: 29, year: 319 },
      business: { month: 99, year: 1089 },
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
    try {
      window.location.assign(
        `mailto:${to}?subject=${encodeURIComponent(subject)}`
      );
    } catch (e) {
      // No mail handler registered: fall back to showing the address so the
      // path is never a dead end.
      if (Wm && Wm.alert) {
        Wm.alert(
          (LOCALE.CONTACT_SALES_VIA || "Please contact our sales team via {0}")
            .format(to)
        );
      }
    }
  }

  _orgIdentError(status) {
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
      default: return LOCALE.SOMETHING_WENT_WRONG;
    }
  }

  // True when the caller currently pays for a PERSONAL Pro subscription (so
  // moving to Team replaces it). Guards the upgrade-confirm popup. Uses the
  // synchronous quota plan as the primary signal — _hasPaidSub is filled
  // asynchronously by _loadSubscription() and may still be false on an early
  // click. NB: the quota `organization` flag is 1 for personal Pro TOO, so it
  // can't distinguish an org — use domain_id (org owners are on a domain > 1;
  // a personal Pro is on the default domain 1), matching the same
  // domain_id <= 1 gate the org-bootstrap checkout uses.

  // True when the caller currently pays for an ORG/Team subscription (so
  // moving to Pro is a plan SWITCH that ends the Team plan). Guards the
  // switch-confirm popup. Synchronous — quota is cached, so the guard works
  // on the very first click, before _loadSubscription() lands.
  _isPaidTeam() {
    const quota = (Visitor.quota && Visitor.quota()) || {};
    const plan = String(quota.plan || "").toLowerCase();
    return plan === "team" && ~~quota.domain_id > 1;
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
    this.postService(SERVICE.payment.checkout, payload)
      .then((data) => {
        const { url, status } = data || {};
        if (url) { window.location.assign(url); return; } // full-page redirect to hosted Checkout
        // The server refuses a purchase while a subscription is live. Say what
        // actually applies instead of the generic failure: nothing to buy, or
        // resume. Re-sync so the tab and the banner reflect the subscription
        // the server just told us about. USE_SUBSCRIPTION_UPDATE is the
        // plan/cycle-switch case: since payment.change_plan exists it is no
        // longer a dead end — offer the in-place switch right away.
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
            // Carry the cycle the checkout form was on: the server answers
            // USE_SUBSCRIPTION_UPDATE for a cycle switch too, and dropping it
            // here turned "Team yearly" into a no-op reported as success.
            if (status === "USE_SUBSCRIPTION_UPDATE") {
              this._confirmPlanChange(plan, period);
            }
          });
          return;
        }
        if (status === "NOT_ORG_OWNER" && Wm && Wm.alert) Wm.alert(LOCALE.NOT_ORG_OWNER);
        else if (status && status !== "OK" && Wm && Wm.alert) Wm.alert(this._orgIdentError(status));
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
          if (this._hasPaidSub || this._isPaidByQuota()) this._confirmCancel();
        } else if (planValue === "team" || planValue === "business") {
          // A live subscription means the click is a plan SWITCH, not a
          // purchase: the server refuses a second checkout (double-billing),
          // so the price is swapped on the existing subscription instead
          // (payment.change_plan). With nothing live it is a normal checkout.
          //
          // The card shows the price for the cycle the Monthly/Yearly tab is
          // on, so that cycle is part of what was clicked — pass it through
          // rather than silently keeping the old one and charging a price the
          // card never displayed.
          if (this._hasActiveSub) {
            this._confirmPlanChange(planValue, this._selectedCycle());
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
        if (/^(free|team|business)$/.test(plan)) {
          // Storage and seats are fixed per plan now (flat pricing), so they
          // are read straight off the plan rather than nudged per branch.
          this.state.checkout.selectedPlan = plan;
          this.state.checkout.storage = this.storage[plan] || 0;
          this.state.checkout.seats = this.seats[plan] || 0;
          this.renderContent();
        }
        return false;

      case "select-billing-cycle":
        const cycle = this._getValueFromCmd(cmd, args);
        if (cycle === "monthly" || cycle === "yearly") {
          this.state.checkout.billingCycle = cycle;
          this.renderContent();
        }
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

    }
  }
}

module.exports = settings_billing;
