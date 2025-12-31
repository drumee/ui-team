const TAB_MONTHLY = 0;
const TAB_YEARLY = 1;
const TAB_CHECKOUT = 2;

class settings_billing extends LetcBox {

  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.model.set({
      hub_id: Visitor.id,
      flow: "g"
    });
    
    this.state = {
      currentTab: TAB_MONTHLY,
      plansTab: {
        cycle: "monthly",
        selectedPlan: null,
      },
      checkout: {
        selectedPlan: "pro",
        seats: 5,
        storage: 0,
        billingCycle: "monthly",
        selectedBundle: null,
      }
    };
    
    this.tab = this.state.currentTab;
    this._setupPaymentWebSocket();
  }

  _setupPaymentWebSocket() {
    const WS_EVENT = "ws:event";
    Wm.on(WS_EVENT, this._handlePaymentWebSocket.bind(this));
  }

  _handlePaymentWebSocket(args = {}) {
    const { data, options } = args || {};
    const { service } = options || {};
    
    if (service === SERVICE.payment.checkout || service === SERVICE.payment.status) {
      this._handlePaymentStatus(data);
    }
  }

  _handlePaymentStatus(data) {
  }

  getViewMode() {
    return _a.grid;
  }

  onDomRefresh() {
    if (this.state.currentTab === undefined || this.state.currentTab === null) {
      this.state.currentTab = TAB_MONTHLY;
    }
    this.tab = this.state.currentTab;
    this.feed(require("./skeleton").default(this));
  }

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
        inputEl.setSelectionRange(this._focusedInput.cursorPosition, this._focusedInput.cursorPosition);
      }
      
      this._focusedInput = null;
    });
  }

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
            this._focusedInput = { fieldName, cursorPosition, value: inputEl.value };
            this.renderContent();
          }
        }
      };
      
      inputEl.addEventListener('change', handleChange);
      inputEl.addEventListener('input', handleChange);
      
      entryWidget.once('destroy', () => {
        inputEl.removeEventListener('change', handleChange);
        inputEl.removeEventListener('input', handleChange);
      });
    });
  }

  /**
   * 
   * @returns 
   */
  updateRightPanel() {
    if (this.state.currentTab !== TAB_CHECKOUT) {
      return;
    }

    if (!this.__rightPanel) {
      this.ensurePart(`${this.fig.family}__checkout-right-panel`).then((panel) => {
        if (panel) {
          this.__rightPanel = panel;
          this._updateRightPanelContent();
        }
      }).catch(() => {
      });
      return;
    }

    this._updateRightPanelContent();
  }

  /**
   * 
   * @returns 
   */
  _updateRightPanelContent() {
    if (!this.__rightPanel) {
      return;
    }

    const { rightPanelContent } = require("./skeleton/checkout");

    if (typeof this.__rightPanel.softClear === 'function') {
      this.__rightPanel.softClear();
    }

    this.__rightPanel.feed(rightPanelContent(this));
  }

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

  _proceedToCheckout() {
    const summary = this.calculateCheckoutSummary(this.state);
    
    const checkout = this.state.checkout || {};
    const selectedPlan = checkout.selectedPlan || "pro";
    const billingCycle = checkout.billingCycle || "monthly";
    
    const totalPriceDollars = parseFloat(summary.totalPrice.replace('$', '')) || 0;
    const value = Math.round(totalPriceDollars * 100);
    const interval = billingCycle === "yearly" ? "year" : "month";
    const description = `${selectedPlan.toUpperCase()} Plan - ${billingCycle} - ${checkout.seats || 5} seats`;
    
    const paymentData = {
      value: value,
      plan: selectedPlan,
      interval: interval,
      description: description
    };
    
    this.postService(SERVICE.payment.checkout, paymentData)
      .then((data) => {
        let { url } = data;
        window.open(url, 'popUpWindow', url);
      })
      .catch((error) => {
        if (Wm && Wm.alert) {
          Wm.alert(LOCALE.SOMETHING_WENT_WRONG || "Something went wrong. Please try again.");
        }
      });
  }

  getSelectPlanData(cmd) {
    let pos = null;
    
    if (cmd.model) {
      pos = cmd.model.get(_a.pos) || cmd.model.get(_a.value) || cmd.model.get('pos') || cmd.model.get('value');
    }
    
    if (pos == null) {
      pos = (cmd.mget && cmd.mget(_a.pos)) || (cmd.get && cmd.get(_a.pos)) || 
            (cmd.mget && cmd.mget(_a.value)) || (cmd.get && cmd.get(_a.value));
    }
    
    if (pos == null) {
      pos = cmd.pos || cmd.value;
    }
    
    if (pos == null && cmd.el) {
      pos = cmd.el.dataset?.pos || cmd.el.dataset?.value;
    }
    
    if (pos == null && cmd.el) {
      pos = cmd.el.getAttribute?.('data-pos') || cmd.el.getAttribute?.('data-value');
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
      const text = cmd.el.textContent?.toLowerCase() || cmd.el.innerText?.toLowerCase();
      if (text && text.includes('monthly')) {
        pos = TAB_MONTHLY;
      } else if (text && text.includes('yearly')) {
        pos = TAB_YEARLY;
      }
    }
    
    return pos;
  }

  handleSelectPlan(cmd) {
    const pos = this.getSelectPlanData(cmd);
    
    if (pos != null && pos !== undefined) {
      const posNum = parseInt(pos);
      if (!isNaN(posNum) && (posNum === TAB_MONTHLY || posNum === TAB_YEARLY)) {
        if (posNum !== this.state.currentTab) {
          this.state.currentTab = posNum;
          this.state.plansTab.cycle = posNum === TAB_MONTHLY ? "monthly" : "yearly";
          this.tab = posNum;
          this.renderContent();
        }
      }
    }
    return false;
  }

  renderContent() {
    if (this.state.currentTab === undefined || this.state.currentTab === null || isNaN(this.state.currentTab)) {
      this.state.currentTab = TAB_MONTHLY;
    }
    if (this.state.currentTab < TAB_MONTHLY || this.state.currentTab > TAB_CHECKOUT) {
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
    
    if (this.__content && typeof this.__content.softClear === 'function') {
      this.__content.softClear();
    }
        
    this.__content.feed(content);
    
    if (this._focusedInput && this.state.currentTab === TAB_CHECKOUT) {
      const focusedField = this._focusedInput.fieldName;
      const sysPn = `${this.fig.family}__checkout-${focusedField}-input`;
      
      this.ensurePart(sysPn).then((entryWidget) => {
        if (entryWidget) {
          this._restoreInputFocus(entryWidget, focusedField);
        }
      }).catch(() => {
      });
    }
  }
  
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
                  (cmd.model && cmd.model.get(_a.service)) ||
                  cmd.mget(_a.name) || 
                  cmd.get(_a.name) ||
                  (cmd.model && cmd.model.get(_a.name));
      }
    }
    
    if (!service && args && args.type === 'click') {
      return false;
    }
    
    if (!service) {
      return super.onUiEvent(cmd, args);
    }
    
    service = String(service);
    console.log("AAAA:408 service", service);
    switch (service) {
      case "select-plan":
        return this.handleSelectPlan(cmd);

      case "select-plan-button":
        const planValue = (cmd.mget && cmd.mget(_a.value)) || (cmd.get && cmd.get(_a.value)) || 
                         cmd.value || cmd.model?.get(_a.value) || cmd.model?.get('value');
        if (planValue === "free" || planValue === "pro" || planValue === "enterprise") {
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
        const plan = (cmd.mget && cmd.mget(_a.value)) || (cmd.get && cmd.get(_a.value)) || 
                     cmd.value || cmd.model?.get(_a.value) || cmd.model?.get('value');
        if (plan === "free" || plan === "pro") {
          this.state.checkout.selectedPlan = plan;
          this.renderContent();
        }
        return false;

      case "select-billing-cycle":
        const cycle = (cmd.mget && cmd.mget(_a.value)) || (cmd.get && cmd.get(_a.value)) || 
                      cmd.value || cmd.model?.get(_a.value) || cmd.model?.get('value');
        if (cycle === "monthly" || cycle === "yearly") {
          this.state.checkout.billingCycle = cycle;
          this.renderContent();
        }
        return false;

      case "select-bundle":
        let bundle = null;
        
        if (cmd && cmd.model) {
          bundle = cmd.model.get(_a.value) || cmd.model.get('value');
        }
        
        if (bundle == null && cmd) {
          bundle = (cmd.mget && cmd.mget(_a.value)) || (cmd.get && cmd.get(_a.value)) || cmd.value;
        }
        
        if (bundle == null && args) {
          bundle = args.value || args.bundle;
        }
        
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

      case "update-seats":
      case "update-storage":
      case "seats":
      case "storage":
      case _a.input:
        let field = null;
        
        if (service === "update-seats" || service === "seats") {
          field = "seats";
        } else if (service === "update-storage" || service === "storage") {
          field = "storage";
        } else if (service === _a.input) {
          const cmdName = (cmd.mget && cmd.mget(_a.name)) || 
                         (cmd.get && cmd.get(_a.name)) || 
                         cmd.name ||
                         (cmd.model && cmd.model.get(_a.name));
          if (cmdName === "seats" || cmdName === "storage") {
            field = cmdName;
          }
        } else {
          const cmdName = (cmd.mget && cmd.mget(_a.name)) || (cmd.get && cmd.get(_a.name)) || cmd.name;
          if (cmdName === "seats" || cmdName === "storage") {
            field = cmdName;
          }
        }
        
        if (field) {
          let value = null;
          
          if (cmd && cmd._input && typeof cmd._input.val === 'function') {
            value = cmd._input.val();
          } else if (cmd && typeof cmd.getValue === 'function') {
            value = cmd.getValue();
          } else if (cmd && cmd._id) {
            const inputEl = document.getElementById(`${cmd._id}-input`);
            if (inputEl) {
              value = inputEl.value;
            }
          }
          
          if (value == null && args && args[field] != null) {
            value = args[field];
          } else if (value == null && args && args.value != null) {
            value = args.value;
          }
          
          if (value == null && cmd && cmd.model) {
            value = cmd.model.get(_a.value) || cmd.model.get('value');
          }
          
          if (value == null && cmd) {
            value = (cmd.mget && cmd.mget(_a.value)) || 
                    (cmd.get && cmd.get(_a.value)) || 
                    cmd.value;
          }
          
          if (value == null && args) {
            value = args[field];
          }
          
          if (value != null && value !== undefined) {
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue >= 0) {
              this.state.checkout[field] = numValue;
              this.updateRightPanel();
            }
          }
        }
        return false;

      case "proceed-checkout-billing":
        this._proceedToCheckout();
        return false;

      default:
        return super.onUiEvent(cmd, args);
    }
  }
}


module.exports = settings_billing
