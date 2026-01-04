const TAB_MONTHLY = 0;
const TAB_YEARLY = 1;
const TAB_CHECKOUT = 2;

class settings_billing extends LetcBox {
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
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
        seats: 5,
        storage: 0,
        billingCycle: "monthly",
        selectedBundle: null,
      },
    };

    this.tab = this.state.currentTab;
    this._setupPaymentWebSocket();
  }

  /**
   * Setup WebSocket listener to receive payment events
   */
  _setupPaymentWebSocket() {
    const WS_EVENT = "ws:event";
    Wm.on(WS_EVENT, this._handlePaymentWebSocket.bind(this));
  }

  /**
   * Handle WebSocket events related to payment
   * @param {Object} args - WebSocket event arguments
   */
  _handlePaymentWebSocket(args = {}) {
    const { data, options } = args || {};
    const { service } = options || {};

    if (
      service === SERVICE.payment.checkout ||
      service === SERVICE.payment.status
    ) {
      this._handlePaymentStatus(data);
    }
  }

  /**
   * Handle payment status updates from WebSocket
   * @param {Object} data - Payment status data
   */
  _handlePaymentStatus(data) { }

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
  onDomRefresh() {
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
      const quota = Visitor.quota();
      
      // Get plan name from quota.plan (primary source)
      const planName = (quota?.plan || "pro").toLowerCase();
      // Get period from plan_detail if available, default to monthly
      const period = quota?.billing_cycle || "monthly";

      // Map plan names: 'advanced' -> 'free', 'pro' -> 'pro', others -> 'pro' as default
      let mappedPlan = "pro";
      if (planName === "advanced" || planName === "free") {
        mappedPlan = "free";
      } else if (planName === "pro") {
        mappedPlan = "pro";
      } else if (planName === "enterprise") {
        mappedPlan = "enterprise";
      }

      // Get seat from quota
      const seats = quota?.seat != null ? quota.seat : 5; // Default to 5 only if seat is null/undefined, not if it's 0

      // Get storage from quota (in bytes, convert to GB)
      // 1 GB = 1,000,000,000 bytes (decimal)
      const storageBytes = quota?.storage || 0;
      let storageGB = Math.floor(storageBytes / 1000000000);

      // If plan is free, set storage to 20GB (fixed, not editable)
      if (mappedPlan === "free") {
        storageGB = 20;
      }

      // Update checkout state with current plan, seats, and storage
      this.state.checkout.selectedPlan = mappedPlan;
      this.state.checkout.billingCycle = period === "year" ? "yearly" : "monthly";
      this.state.checkout.seats = seats;
      this.state.checkout.storage = storageGB;

      // Store plan data for reference
      this.currentPlan = {
        plan: planName,
        period: period,
      };
      this._currentSubsType = period;
      this.currentPlanName = mappedPlan;

      return this.feed(require("./skeleton").default(this));
    } catch (e) {
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
        this._setupInputChangeListener(child, "seats");
        this._restoreInputFocus(child, "seats");
        break;
      case `${this.fig.family}__checkout-storage-input`:
        this._setupInputChangeListener(child, "storage");
        this._restoreInputFocus(child, "storage");
        break;
    }
  }

  /**
   * Restore focus and cursor position for input field after re-render
   * @param {Object} entryWidget - Entry widget instance
   * @param {string} fieldName - Field name (seats or storage)
   */
  _restoreInputFocus(entryWidget, fieldName) {
    if (!this._focusedInput || this._focusedInput.fieldName !== fieldName) {
      return;
    }

    if (!entryWidget || !entryWidget._id) return;

    const inputId = `${entryWidget._id}-input`;

    this.waitElement(inputId, () => {
      const inputEl = document.getElementById(inputId);
      if (!inputEl) return;

      if (this._focusedInput.value !== undefined) {
        inputEl.value = this._focusedInput.value;
      }

      if (this._focusedInput.cursorPosition !== undefined) {
        inputEl.focus();
        inputEl.setSelectionRange(
          this._focusedInput.cursorPosition,
          this._focusedInput.cursorPosition
        );
      }

      this._focusedInput = null;
    });
  }

  /**
   * Setup event listeners for input field to update state when user types
   * @param {Object} entryWidget - Entry widget instance
   * @param {string} fieldName - Field name (seats or storage)
   */
  _setupInputChangeListener(entryWidget, fieldName) {
    if (!entryWidget || !entryWidget._id) return;

    const inputId = `${entryWidget._id}-input`;

    this.waitElement(inputId, () => {
      const inputEl = document.getElementById(inputId);
      if (!inputEl) return;

      const handleChange = () => {
        const value = inputEl.value;
        let numValue = parseInt(value);

        if (value === "" || isNaN(numValue)) {
          numValue = fieldName === "storage" ? 0 : 5;
        }

        if (numValue >= 0) {
          this.state.checkout[fieldName] = numValue;

          if (this.state.currentTab === TAB_CHECKOUT) {
            const cursorPosition = inputEl.selectionStart;
            this._focusedInput = {
              fieldName,
              cursorPosition,
              value: inputEl.value,
            };
            this.renderContent();
          }
        }
      };

      inputEl.addEventListener("change", handleChange);
      inputEl.addEventListener("input", handleChange);

      entryWidget.once("destroy", () => {
        inputEl.removeEventListener("change", handleChange);
        inputEl.removeEventListener("input", handleChange);
      });
    });
  }

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
  calculateCheckoutSummary(state) {
    const checkout = state?.checkout || {};
    const selectedPlan = checkout.selectedPlan || "pro";
    const seats = parseInt(checkout.seats) || 5;
    const storage = parseInt(checkout.storage) || 0;
    const billingCycle = checkout.billingCycle || "monthly";
    const selectedBundle = checkout.selectedBundle;

    const planPrices = {
      free: { monthly: 0, yearly: 0 },
      pro: { monthly: 16.99, yearly: 169.9 },
    };

    const bundlePrices = {
      100: 8,
      200: 14,
      500: 30,
      1000: 50,
    };

    const basePrice = planPrices[selectedPlan]?.[billingCycle] || 0;
    const period = billingCycle === "yearly" ? "year" : "month";

    const bundlePrice = selectedBundle ? bundlePrices[selectedBundle] || 0 : 0;
    const bundleStorage = selectedBundle ? parseInt(selectedBundle) : 0;

    const baseStorage = selectedPlan === "pro" ? 50 : 5;
    const totalStorage = baseStorage + bundleStorage + storage;

    const totalPrice =
      billingCycle === "yearly"
        ? basePrice + bundlePrice * 12
        : basePrice + bundlePrice;

    const effectivePricePerSeat = seats > 0 ? totalPrice / seats : 0;

    const formatCurrency = (amount) => {
      return `$${amount.toFixed(2)}`;
    };

    return {
      basePrice: formatCurrency(basePrice),
      bundlePrice: formatCurrency(bundlePrice),
      totalPrice: formatCurrency(totalPrice),
      period: period,
      seats: seats.toString(),
      totalStorage: `${totalStorage} GB`,
      effectivePricePerSeat: formatCurrency(effectivePricePerSeat),
      selectedPlan,
      billingCycle,
    };
  }

  /**
 * 
 */
  _openLink(url) {
    if (Visitor.device() == _a.mobile) {
      window.open(url, "_blank", "noopener; noreferrer");
    } else {
      let w = Math.min(900, screen.availWidth - 100);
      let h = Math.min(700, screen.availHeight - 100);
      let x = screen.availWidth/2 - w/2;
      let y = 0;
      window.open(url, "_blank", `popup, noopener, noreferrer, width=${w}, height=${h}, left=${x}, top=${y}`);
    }
  }

  /**
   * Handle proceed to checkout: call payment API and open payment window
   */
  _proceedToCheckout() {
    const summary = this.calculateCheckoutSummary(this.state);

    const checkout = this.state.checkout || {};
    const selectedPlan = checkout.selectedPlan || "pro";
    const billingCycle = checkout.billingCycle || "monthly";

    const totalPriceDollars =
      parseFloat(summary.totalPrice.replace("$", "")) || 0;
    const value = Math.round(totalPriceDollars * 100);
    const interval = billingCycle === "yearly" ? "year" : "month";
    const description = `${selectedPlan.toUpperCase()} Plan - ${billingCycle} - ${checkout.seats || 5
      } seats`;

    const paymentData = {
      value: value,
      seats: checkout.seats || 0,
      storage: checkout.storage || 0,
      plan: selectedPlan,
      interval: interval,
      description: description,
    };

    this.postService(SERVICE.payment.checkout, paymentData)
      .then((data) => {
        let { url } = data;
        this._openLink(url);
      })
      .catch((e) => {
        this.warn("Got backend error [_proceedToCheckout]:", e)
        if (Wm && Wm.alert) {
          Wm.alert(
            LOCALE.SOMETHING_WENT_WRONG ||
            "Something went wrong. Please try again."
          );
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
      const text =
        cmd.el.textContent?.toLowerCase() || cmd.el.innerText?.toLowerCase();
      if (text && text.includes("monthly")) {
            pos = TAB_MONTHLY;
      } else if (text && text.includes("yearly")) {
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
    if (service === "update-seats" || service === "seats") {
      return "seats";
    }

    if (service === "update-storage" || service === "storage") {
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
    let service = args.service;

    if (!service && cmd) {
      if (cmd.source) {
        service = cmd.source.mget && cmd.source.mget(_a.service);
      }
      if (!service) {
        service = cmd.service ||
          (cmd.mget && cmd.mget(_a.service)) ||
          (cmd.get && cmd.get(_a.service)) ||
          (cmd.model && cmd.model.get && cmd.model.get(_a.service)) ||
          (cmd.mget && cmd.mget(_a.name)) ||
          (cmd.get && cmd.get(_a.name)) ||
          cmd.name;
      }
    }

    if (!service && args && args.type === 'click') {
      return false;
    }

    if (!service) {
      return super.onUiEvent(cmd, args);
    }
    console.log("AAAA:720 service", service);
    service = String(service);
    switch (service) {
      case "select-plan":
        return this.handleSelectPlan(cmd);

      case "select-plan-button":
        const planValue = this._getValueFromCmd(cmd, args);
        if (
          planValue === "free" ||
          planValue === "pro" ||
          planValue === "enterprise"
        ) {
          if (planValue === "enterprise") {
            if (Wm && Wm.alert) {
              Wm.alert("Please contact our sales team via frenz@drumee.org");
            }
          } else {
            this.state.checkout.selectedPlan = planValue;
            this.state.currentTab = TAB_CHECKOUT;
            this.tab = TAB_CHECKOUT;
            this.renderContent();
          }
        }
        return false;

      case "checkout":
        if (this.state.currentTab !== TAB_CHECKOUT) {
          this.state.currentTab = TAB_CHECKOUT;
          this.tab = TAB_CHECKOUT;
          this.renderContent();
        }
        return false;

      case "select-checkout-plan":
        const plan = this._getValueFromCmd(cmd, args);
        if (plan === "free" || plan === "pro") {
          this.state.checkout.selectedPlan = plan;
          // If switching to free plan, set storage to 20GB and clear bundle selection
          if (plan === "free") {
            this.state.checkout.storage = 20;
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

      case "update-seats":
      case "update-storage":
      case "seats":
      case "storage":
      case _a.input:
        return this._handleInputField(cmd, args, service);

      case "proceed-checkout-billing":
        this._proceedToCheckout();
        return false;

      default:
        return super.onUiEvent(cmd, args);
    }
  }
}

module.exports = settings_billing;
