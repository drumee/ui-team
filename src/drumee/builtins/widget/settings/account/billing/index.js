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
    this.storage = {
      free: 20,
      pro: 20,
      team: 50
    }
    this.seats = {
      free: 0,
      pro: 5,
      team: 1
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
      default:
        if (super.onWsMessage) super.onWsMessage(service, data, options);
    }
  }

  // Fetch the caller's subscription mirror and derive the pending-cancel flags
  // the banner + cancel/resume actions read. A hard cancel removes the mirror
  // row → _subscription null → no banner (workspace already on Free).
  async _loadSubscription() {
    this._subscription = await this.fetchService(SERVICE.payment.subscription_status, { hub_id: Visitor.id })
      .then((d) => (d && d.subscription_id ? d : null))
      .catch(() => null);
    const sub = this._subscription;
    const now = Math.floor(Date.now() / 1000);
    this._periodEnd = (sub && Number(sub.period_end)) || 0;
    // Pending cancel = mirror status 'canceled' with the paid period still in
    // the future (access retained until period_end). Distinct from a terminated
    // sub, whose row is gone.
    this._isCanceling = !!(sub && sub.status === "canceled" && this._periodEnd > now);
    this._hasPaidSub = !!(sub && sub.subscription_id);
    return sub;
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
    // Team seats warning.
    const seats = parseInt(sub.seats, 10) || 0;
    const isOrg = (parseInt(sub.organization, 10) || 0) === 1 || sub.entity_type === "org";
    if (isOrg && seats > 0) {
      lines.push((LOCALE.CANCEL_TEAM_SEATS || "Your team's {0} member seats will be removed and each member drops to their own Free plan.").format(seats));
    }
    return lines.join("\n\n");
  }

  async _confirmCancel() {
    if (!this._hasPaidSub || this._isCanceling) return;
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
    if (typeof Butler !== "undefined" && Butler.say) Butler.say(LOCALE.SUBSCRIPTION_RESUMED_TOAST || "Your subscription has been resumed.");
    this.fetchPlanData();
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
    // Fetch the server catalog (Stripe is the price truth) so the display
    // reflects live prices; degrades to the hardcoded fallback if unavailable.
    this._catalog = await this.fetchService(SERVICE.payment.catalog, { hub_id: Visitor.id })
      .then((d) => (d && d.plans) || null)
      .catch(() => null);
    // Live subscription mirror (status, period_end, seats) — org-aware on the
    // server (an org owner sees the team subscription). Also computes the
    // pending-cancel flags the banner + cancel/resume actions key off.
    await this._loadSubscription();
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
    if (this.state.currentTab === undefined || this.state.currentTab === null) {
      this.state.currentTab = TAB_MONTHLY;
    }
    this.tab = this.state.currentTab;
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
      const planName = (plan || "pro").toLowerCase();
      // Get period from plan_detail if available, default to monthly

      // Map plan names: 'advanced' -> 'free'; team/enterprise kept as-is so the
      // current-plan marking and checkout pre-selection are correct for org subs.
      let mappedPlan = "pro";
      if (planName === "advanced" || planName === "free") {
        mappedPlan = "free";
      } else if (planName === "pro") {
        mappedPlan = "pro";
      } else if (planName === "team") {
        mappedPlan = "team";
      } else if (planName === "enterprise") {
        mappedPlan = "enterprise";
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
      // Update checkout state with current plan, seats, and storage
      this.state.checkout.selectedPlan = mappedPlan;
      this.state.checkout.billingCycle = billing_cycle;
      this.state.checkout.seats = total_seat || 0;
      this.state.checkout.storage = storageGB;
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
  calculateCheckoutSummary() {
    let state = this.state;
    const checkout = state?.checkout || {};
    const selectedPlan = checkout.selectedPlan || "pro";
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

    const selectedBundle = checkout.selectedBundle;

    // Prices come from the server catalog (Stripe is the truth); fall back to
    // the previous literals only if the catalog didn't load.
    const catPrice = (code, cycle) => {
      const period = cycle === "yearly" ? "year" : "month";
      const row = (this._catalog || []).find((p) => p.plan_code === code && p.period === period);
      return row && row.amount != null ? Number(row.amount) / 100 : null;
    };
    const planPrices = {
      free: { monthly: 0, yearly: 0 },
      pro: { monthly: catPrice("pro", "monthly") ?? 16.99, yearly: catPrice("pro", "yearly") ?? 169.9 },
      team: { monthly: catPrice("team", "monthly") ?? 8, yearly: catPrice("team", "yearly") ?? 80 },
    };

    const basePrice = planPrices[selectedPlan]?.[billingCycle] || 0;
    const period = billingCycle === "yearly" ? "year" : "month";
    // Storage bundles + extra Pro seats are catalog rows (storage_*, pro_seat)
    // with per-period Stripe prices — no more hardcoded amounts or the old
    // yearly x10 multiplier. Fallbacks keep the panel usable offline.
    const bundleFallback = { 100: { monthly: 8, yearly: 80 }, 500: { monthly: 30, yearly: 300 }, 1000: { monthly: 50, yearly: 500 } };
    const bundlePrice = selectedBundle
      ? (catPrice(`storage_${selectedBundle}`, billingCycle)
          ?? bundleFallback[selectedBundle]?.[billingCycle] ?? 0)
      : 0;
    const bundleStorage = selectedBundle ? parseInt(selectedBundle) : 0;
    const seatPrice = catPrice("pro_seat", billingCycle) ?? (billingCycle === "yearly" ? 50 : 5);

    // Pro plan: base storage + bundle storage
    let totalStorage = baseStorage + bundleStorage;

    let totalPrice = basePrice + bundlePrice;
    let extraSeats = 0;
    if (this.__seatsInput) {
      let value = this.__seatsInput.getValue()
      if (value > baseSeats) {
        extraSeats = value - baseSeats;
        totalPrice = totalPrice + extraSeats * seatPrice;
      }
      if (value < baseSeats) {
        this.__seatsInput.setValue(baseSeats)
      }
    }
    let seats = baseSeats + extraSeats
    const effectivePricePerSeat = totalPrice / seats;

    let r = {
      basePrice: formatCurrency(basePrice),
      bundlePrice: formatCurrency(bundlePrice),
      totalPrice: formatCurrency(totalPrice),
      period: period,
      seats,
      totalStorage: `${totalStorage} GB`,
      effectivePricePerSeat: formatCurrency(effectivePricePerSeat),
      selectedPlan,
      billingCycle,
      extraSeats,
      bundleStorage
    };
    return r
  }


  /**
   * Display price (in currency units) for a plan/period from the server
   * catalog (Stripe is the truth); falls back to the previous literals so
   * the cards never render blank if the catalog didn't load.
   * @param {string} code - plan code ('pro' | 'team')
   * @param {string} period - 'month' | 'year'
   * @returns {number} amount in currency units
   */
  _catPrice(code, period) {
    const row = (this._catalog || []).find(
      (p) => p.plan_code === code && p.period === period
    );
    if (row && row.amount != null) return Number(row.amount) / 100;
    const fb = {
      pro: { month: 16.99, year: 169.9 },
      team: { month: 8, year: 80 },
      pro_seat: { month: 5, year: 50 },
      storage_100: { month: 8, year: 80 },
      storage_500: { month: 30, year: 300 },
      storage_1000: { month: 50, year: 500 },
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
  _proceedToCheckout() {
    // The SERVER decides the price (Stripe price_id from yp.plan); the client
    // only declares WHAT to buy. plan 'team' => org (per-seat) checkout.
    const checkout = this.state.checkout || {};
    const plan = checkout.selectedPlan || "pro";
    const entity_type = plan === "team" ? "org" : "user";
    const period = checkout.billingCycle === "yearly" ? "year" : "month";
    // Org (team): quantity = seats. Pro per-seat: send the requested seat
    // total too — the server turns seats beyond the plan's included 5 into a
    // recurring pro_seat line item.
    const requested = Math.max(1, ~~((this.__seatsInput && this.__seatsInput.getValue()) || checkout.seats || 1));
    const seats = entity_type === "org" ? requested : (plan === "pro" ? requested : 1);
    // Optional storage add-on: the bundle picker stores 100/500/1000 -> storage_*.
    const bundle = checkout.selectedBundle ? `storage_${checkout.selectedBundle}` : "";
    // hub_id is REQUIRED: payment.checkout is ACL scope:hub/src:owner. Without it
    // the server falls back to the host hub (where the caller isn't owner) and
    // returns 403 PERMISSION_DENIED. Send the caller's own hub so the owner
    // check resolves correctly (verified: missing hub_id -> 403, present -> 200).
    this.postService(SERVICE.payment.checkout, { hub_id: Visitor.id, entity_type, plan, period, seats, bundle })
      .then((data) => {
        const { url, status } = data || {};
        if (url) { window.location.assign(url); return; } // full-page redirect to hosted Checkout
        if (status === "NOT_ORG_OWNER" && Wm && Wm.alert) Wm.alert(LOCALE.NOT_ORG_OWNER);
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

      case "select-plan-button":
        const planValue = this._getValueFromCmd(cmd, args);
        if (
          planValue === "free" ||
          planValue === "pro" ||
          planValue === "team" ||
          planValue === "enterprise"
        ) {
          if (planValue === "enterprise") {
            if (Wm && Wm.alert) {
              Wm.alert(
                (LOCALE.CONTACT_SALES_VIA || "Please contact our sales team via {0}")
                  .format(LOCALE.SALES_CONTACT_EMAIL || "contact@drumee.org")
              );
            }
          } else {
            this.state.checkout.selectedPlan = planValue;
            this.state.currentTab = TAB_CHECKOUT;
            this.tab = TAB_CHECKOUT;
            this.renderContent();
          }
        }
        return false;
      case "storage-changes":
        this.state.checkout.storage = args.value;
        this._updateRightPanelContent()
        break;
      case "seats-changes":
        this.state.checkout.seats = args.value;
        this._updateRightPanelContent()
        break;
      case "checkout":
        if (this.state.currentTab !== TAB_CHECKOUT) {
          this.state.currentTab = TAB_CHECKOUT;
          this.tab = TAB_CHECKOUT;
          this.renderContent();
        }
        return false;

      case "select-checkout-plan":
        const plan = this._getValueFromCmd(cmd, args);
        if (plan === "free" || plan === "pro" || plan === "team") {
          this.state.checkout.selectedPlan = plan;
          // If switching to free plan, set storage to 20GB and clear bundle selection
          if (plan === "free") {
            this.state.checkout.storage = 20;
            this.state.checkout.selectedBundle = "";
          }
          // If switching to pro plan, set seats to 5 and additional storage to 0
          if (plan === "pro") {
            this.state.checkout.seats = 5;
            this.state.checkout.storage = 0;
            this.state.checkout.selectedBundle = "";
          }
          // Team is per-seat (org): start at the team baseline seats, no add-on.
          if (plan === "team") {
            this.state.checkout.seats = this.seats.team || 1;
            this.state.checkout.storage = 0;
            this.state.checkout.selectedBundle = "";
          }
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
