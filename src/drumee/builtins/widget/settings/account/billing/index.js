

/**
 * Billing Information Widget
 * 
 * Logic:
 * - Tab MONTHLY: Show plans with monthly pricing from plans.js
 * - Tab YEARLY: Show plans with yearly pricing from plans.js  
 * - Tab CHECKOUT: Show checkout layout from checkout.js
 * 
 * When switching between Monthly/Yearly, plans.js receives cycle parameter
 * to display correct pricing (monthly vs yearly).
 */

// Tab constants
const TAB_MONTHLY = 0;
const TAB_YEARLY = 1;
const TAB_CHECKOUT = 2;

class settings_billing extends LetcBox {

  /**
   * @param {*} opt
   */
  initialize(opt) {
    require("./skin");
    super.initialize(opt);
    this.model.set({
      hub_id: Visitor.id,
      flow: "g"
    });
    
    // Initialize state object to manage all billing data
    this.state = {
      // Current active tab: TAB_MONTHLY, TAB_YEARLY, or TAB_CHECKOUT
      currentTab: TAB_MONTHLY,
      
      // Plans tab state (Monthly/Yearly)
      plansTab: {
        cycle: "monthly", // "monthly" or "yearly"
        selectedPlan: null, // "free", "pro", or "enterprise"
      },
      
      // Checkout tab state
      checkout: {
        selectedPlan: "pro", // "free" or "pro"
        seats: 5, // Number of seats (default: 5 included in Pro)
        storage: 0, // Additional storage in GB
        billingCycle: "monthly", // "monthly" or "yearly"
        selectedBundle: null, // Selected storage bundle: "100", "200", "500", "1000", or null
      }
    };
    
    // Keep backward compatibility
    this.tab = this.state.currentTab;
    
    // Setup WebSocket listener for payment status updates
    this._setupPaymentWebSocket();
  }

  /**
   * Setup WebSocket listener for payment status updates
   */
  _setupPaymentWebSocket() {
    const WS_EVENT = "ws:event";
    Wm.on(WS_EVENT, this._handlePaymentWebSocket.bind(this));
  }

  /**
   * Handle WebSocket events for payment
   * @param {*} args - WebSocket event args
   */
  _handlePaymentWebSocket(args = {}) {
    const { data, options } = args || {};
    const { service } = options || {};
    
    // Handle payment status updates
    if (service === SERVICE.payment.checkout || service === SERVICE.payment.status) {
      this.debug("Payment status update received:", data);
      this._handlePaymentStatus(data);
    }
  }

  /**
   * Handle payment status updates from WebSocket
   * @param {*} data - Payment status data
   */
  _handlePaymentStatus(data) {
    // TODO: Update UI based on payment status
    // For example: show success message, update subscription status, etc.
    this.debug("Handling payment status:", data);
    
    // You can update UI here based on payment status
    // Example: if (data.status === 'succeeded') { ... }
  }

  /**
   * 
   */
  getViewMode() {
    return _a.grid;
  }

  /**
   * Initial render - only called once when widget is first created
   */
  onDomRefresh() {
    // Ensure state is initialized
    if (this.state.currentTab === undefined || this.state.currentTab === null) {
      this.state.currentTab = TAB_MONTHLY;
    }
    // Keep backward compatibility
    this.tab = this.state.currentTab;
    // Feed initial skeleton
    this.feed(require("./skeleton").default(this));
  }

  /**
   * @param {*} child
   * @param {*} pn
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
    }
  }

  /**
   * Update only the right panel (summary) without re-rendering entire content
   * This is used when input fields change to avoid resetting user input
   */
  updateRightPanel() {
    if (this.state.currentTab !== TAB_CHECKOUT) {
      return; // Only update if on checkout tab
    }
    
    if (!this.__rightPanel) {
      // If right panel not cached, try to find it
      this.ensurePart(`${this.fig.family}__checkout-right-panel`).then((panel) => {
        if (panel) {
          this.__rightPanel = panel;
          this._updateRightPanelContent();
        }
      }).catch(() => {
        // If not found, don't render - just skip update to avoid resetting input fields
        // Parts will be ready after initial render completes
        this.debug("Right panel part not found, skipping update to avoid resetting inputs");
      });
      return;
    }
    
    this._updateRightPanelContent();
  }

  /**
   * Internal method to update right panel content
   */
  _updateRightPanelContent() {
    if (!this.__rightPanel) return;
    
    const { calculateCheckoutSummary } = require("./skeleton/checkout");
    const summary = calculateCheckoutSummary(this.state);
    const pfx = `${this.fig.family}__checkout`;
    
    // Create new right panel content
    const rightPanelContent = Skeletons.Box.Y({
      className: `${pfx}-right`,
      kids: [
        Skeletons.Note({
          className: `${pfx}-total-label`,
          content: LOCALE.TOTAL_OUTCOME,
        }),
        Skeletons.Note({
          className: `${pfx}-total-price`,
          content: `${summary.totalPrice} /${summary.period}`,
        }),
        Skeletons.Box.Y({
          className: `${pfx}-breakdown`,
          kids: [
            Skeletons.Box.X({
              className: `${pfx}-breakdown-item`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}-breakdown-label`,
                  content: LOCALE.BASE_PRICE,
                }),
                Skeletons.Note({
                  className: `${pfx}-breakdown-value`,
                  content: summary.basePrice,
                }),
              ],
            }),
            Skeletons.Box.X({
              className: `${pfx}-breakdown-item`,
              kids: [
                Skeletons.Note({
                  className: `${pfx}-breakdown-label`,
                  content: LOCALE.INCLUDED_SEATS,
                }),
                Skeletons.Note({
                  className: `${pfx}-breakdown-value`,
                  content: summary.seats,
                }),
              ],
            }),
            Skeletons.Box.X({
              className: `${pfx}-breakdown-item`,
              kids: [
                Skeletons.Button.Icon({
                  className: `${pfx}-breakdown-icon`,
                  ico: "hard-drive",
                }),
                Skeletons.Note({
                  className: `${pfx}-breakdown-label`,
                  content: LOCALE.TOTAL_STORAGE,
                }),
                Skeletons.Note({
                  className: `${pfx}-breakdown-value`,
                  content: summary.totalStorage,
                }),
              ],
            }),
            Skeletons.Box.X({
              className: `${pfx}-breakdown-item`,
              kids: [
                Skeletons.Button.Icon({
                  className: `${pfx}-breakdown-icon`,
                  ico: "trending-up",
                }),
                Skeletons.Note({
                  className: `${pfx}-breakdown-label`,
                  content: LOCALE.EFFECTIVE_PRICE_PER_SEAT,
                }),
                Skeletons.Note({
                  className: `${pfx}-breakdown-value`,
                  content: summary.effectivePricePerSeat,
                }),
              ],
            }),
          ],
        }),
        Skeletons.Button.Label({
          label: LOCALE.PROCEED_TO_CHECKOUT,
          className: `${pfx}-checkout-button`,
          ico: "cart",
          service: "proceed-checkout",
          priority: "primary",
        }),
      ],
    });
    
    this.__rightPanel.feed(rightPanelContent);
  }

  /**
   * Proceed to checkout - call payment API
   */
  _proceedToCheckout() {
    const { calculateCheckoutSummary } = require("./skeleton/checkout");
    const summary = calculateCheckoutSummary(this.state);
    
    // Get checkout state
    const checkout = this.state.checkout || {};
    const selectedPlan = checkout.selectedPlan || "pro";
    const billingCycle = checkout.billingCycle || "monthly";
    
    // Calculate total price in dollars
    const totalPriceDollars = parseFloat(summary.totalPrice.replace('$', '')) || 0;
    
    // Convert to centimes (multiply by 100)
    const value = Math.round(totalPriceDollars * 100);
    
    // Convert billing cycle to interval format
    const interval = billingCycle === "yearly" ? "year" : "month";
    
    // Create description
    const description = `${selectedPlan.toUpperCase()} Plan - ${billingCycle} - ${checkout.seats || 5} seats`;
    
    // Prepare payment data
    const paymentData = {
      value: value, // Integer in centimes
      plan: selectedPlan, // 'pro' or 'free'
      interval: interval, // 'year' or 'month'
      description: description
    };
    
    this.debug("Proceeding to checkout with payment data:", paymentData);
    
    // Call payment API
    this.postService(SERVICE.payment.checkout, paymentData)
      .then((data) => {
        this.debug("Payment checkout response:", data);
        
        // If response contains URL, open payment page
        if (data && data.url) {
          window.open(data.url, '_blank', 'noopener,noreferrer');
        } else {
          // Handle success case
          this.debug("Checkout successful, waiting for payment status via WebSocket");
          // Payment status will be updated via WebSocket
        }
      })
      .catch((error) => {
        this.debug("Payment checkout error:", error);
        // TODO: Show error message to user
        if (Wm && Wm.alert) {
          Wm.alert(LOCALE.SOMETHING_WENT_WRONG || "Something went wrong. Please try again.");
        }
      });
  }

  /**
   * Re-render content based on current tab
   * 
   * Tab mapping:
   * - TAB_MONTHLY: Monthly → plans.js with cycle="monthly"
   * - TAB_YEARLY: Yearly → plans.js with cycle="yearly"
   * - TAB_CHECKOUT: Checkout → checkout.js
   */
  renderContent() {
    // Ensure state.currentTab is valid
    if (this.state.currentTab === undefined || this.state.currentTab === null || isNaN(this.state.currentTab)) {
      this.state.currentTab = TAB_MONTHLY;
    }
    // Ensure tab is within valid range
    if (this.state.currentTab < TAB_MONTHLY || this.state.currentTab > TAB_CHECKOUT) {
      this.state.currentTab = TAB_MONTHLY;
    }
    
    // Keep backward compatibility
    this.tab = this.state.currentTab;
    
    
    // Use cached references from onPartReady - these should always be available after initial render
    // If parts are not available, re-render entire skeleton
    if (!this.__tabsTrigger || !this.__content) {
      this.debug("Parts not ready, re-rendering entire skeleton. tabsTrigger:", !!this.__tabsTrigger, "content:", !!this.__content);
      this.feed(require("./skeleton").default(this));
      return;
    }
    
    // Update header tab states to show which tab is active
        const header = require("./skeleton/header").default(this);
    this.__tabsTrigger.feed(header);
    
    // Update content based on current tab
    // Use getContent helper from skeleton to ensure consistent structure
    const { getContent } = require("./skeleton");
    const content = getContent(this);
    
    // Clear existing content first to ensure fresh render with updated state
    if (this.__content && typeof this.__content.softClear === 'function') {
      this.__content.softClear();
        }
        
    // Feed new content directly - this.__content is already the wrapper container
    // feed() will replace the children of this.__content
    this.__content.feed(content);
  }

  triggerHandlers(cmd, args = {}) {
    super.triggerHandlers(cmd, args);
    if (cmd.service === "proceed-checkout-billing") {
      this._proceedToCheckout();
    }
  }

  /**
   * Handle UI events
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    // Try multiple ways to get service name
    let service = args.service;
    if (!service && cmd) {
      // Try from cmd.source first (if event comes from child widget)
      if (cmd.source) {
        service = cmd.source.mget && cmd.source.mget(_a.service);
      }
      // Then try from cmd directly
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
    
    this.debug("Billing onUiEvent - service:", service, "cmd:", cmd, "args:", args);
    
    // Ignore click events from input fields - they're just for focusing, not for processing
    // Only process input events (service = _a.input) or other meaningful services
    if (!service && args && args.type === 'click') {
      // Click event without service - likely from input field focus, ignore
      return false;
    }
    
    if (!service) {
      this.debug("No service found, passing to parent");
      return super.onUiEvent(cmd, args);
    }
    
    // Convert service to string for comparison
    service = String(service);
    
    switch (service) {
      case "select-plan":
        // Handle Monthly (TAB_MONTHLY) or Yearly (TAB_YEARLY) tab selection
        // Try multiple ways to get pos value from cmd
        let pos = null;
        
        // Method 1: From cmd.model (Backbone model)
        if (cmd.model) {
          pos = cmd.model.get(_a.pos) || cmd.model.get(_a.value) || cmd.model.get('pos') || cmd.model.get('value');
        }
        
        // Method 2: From cmd.mget or cmd.get (if cmd is a view/model)
        if (pos == null) {
          pos = (cmd.mget && cmd.mget(_a.pos)) || (cmd.get && cmd.get(_a.pos)) || 
                (cmd.mget && cmd.mget(_a.value)) || (cmd.get && cmd.get(_a.value));
        }
        
        // Method 3: From cmd properties directly
        if (pos == null) {
          pos = cmd.pos || cmd.value;
        }
        
        // Method 4: From cmd.el dataset
        if (pos == null && cmd.el) {
          pos = cmd.el.dataset?.pos || cmd.el.dataset?.value;
        }
        
        // Method 5: From cmd.el attributes
        if (pos == null && cmd.el) {
          pos = cmd.el.getAttribute?.('data-pos') || cmd.el.getAttribute?.('data-value');
        }
        
        // Method 6: Fallback - determine tab from text content or parent index
        if (pos == null && cmd.el) {
          // Try to find parent tab item
          let parent = cmd.el.closest?.(`.${this.fig.family}__tabs-trigger-item`);
          if (parent) {
            // Get index from parent container
            const parentContainer = parent.parentElement;
            if (parentContainer) {
              const children = Array.from(parentContainer.children);
              const index = children.indexOf(parent);
              if (index !== -1 && index < TAB_CHECKOUT) {
                pos = index; // Monthly = TAB_MONTHLY, Yearly = TAB_YEARLY
              }
            }
          }
        }
        
        // Method 7: Fallback - determine from text content
        if (pos == null && cmd.el) {
          const text = cmd.el.textContent?.toLowerCase() || cmd.el.innerText?.toLowerCase();
          if (text && text.includes('monthly')) {
            pos = TAB_MONTHLY;
          } else if (text && text.includes('yearly')) {
            pos = TAB_YEARLY;
          }
        }
        
        this.debug("Select plan - pos:", pos, "current tab:", this.tab, "cmd:", cmd);
        
        if (pos != null && pos !== undefined) {
          const posNum = parseInt(pos);
          if (!isNaN(posNum) && (posNum === TAB_MONTHLY || posNum === TAB_YEARLY)) {
            // Only update if tab actually changed
            if (posNum !== this.state.currentTab) {
              this.state.currentTab = posNum;
              this.state.plansTab.cycle = posNum === TAB_MONTHLY ? "monthly" : "yearly";
              this.tab = posNum; // Backward compatibility
              this.debug("Tab changed to:", this.state.currentTab, "cycle:", this.state.plansTab.cycle);
              this.renderContent();
            } else {
              this.debug("Tab unchanged, skipping render");
            }
          } else {
            this.debug("Invalid pos value, cannot parse or out of range:", pos);
          }
        } else {
          this.debug("pos is null/undefined, cannot determine tab. cmd.el:", cmd.el);
        }
        // Prevent bubbling to parent
        return false;

      case "checkout":
        // Handle Checkout tab (TAB_CHECKOUT) selection
        this.debug("Checkout service triggered");
        if (this.state.currentTab !== TAB_CHECKOUT) {
          this.state.currentTab = TAB_CHECKOUT;
          this.tab = TAB_CHECKOUT; // Backward compatibility
          this.debug("Switching to checkout tab");
          this.renderContent();
        } else {
          this.debug("Already on checkout tab");
        }
        // Prevent bubbling to parent
        return false;

      case "select-checkout-plan":
        // Handle plan selection in checkout (Free or Pro)
        const plan = (cmd.mget && cmd.mget(_a.value)) || (cmd.get && cmd.get(_a.value)) || 
                     cmd.value || cmd.model?.get(_a.value) || cmd.model?.get('value');
        if (plan === "free" || plan === "pro") {
          this.state.checkout.selectedPlan = plan;
          this.debug("Checkout plan changed to:", plan);
          this.renderContent();
        }
        return false;

      case "select-billing-cycle":
        // Handle billing cycle selection in checkout (Monthly or Yearly)
        const cycle = (cmd.mget && cmd.mget(_a.value)) || (cmd.get && cmd.get(_a.value)) || 
                      cmd.value || cmd.model?.get(_a.value) || cmd.model?.get('value');
        if (cycle === "monthly" || cycle === "yearly") {
          this.state.checkout.billingCycle = cycle;
          this.debug("Checkout billing cycle changed to:", cycle);
          this.renderContent();
        }
        return false;

      case "select-bundle":
        // Handle storage bundle selection in checkout - radio behavior (only one can be selected)
        const bundle = (cmd.mget && cmd.mget(_a.value)) || (cmd.get && cmd.get(_a.value)) || 
                       cmd.value || cmd.model?.get(_a.value) || cmd.model?.get('value');
        
        // Validate bundle value
        if (!bundle || !["100", "200", "500", "1000"].includes(String(bundle))) {
          this.debug("Invalid bundle value:", bundle);
          return false;
        }
        
        // Radio behavior: only one bundle can be selected at a time
        // When a new bundle is selected, it automatically deselects the previous one
        const bundleValue = String(bundle);
        const previousBundle = this.state.checkout.selectedBundle;
        
        // Update state with new selection (this automatically deselects others)
        // If clicking the same item, keep it selected (don't toggle)
        if (previousBundle !== bundleValue) {
          this.state.checkout.selectedBundle = bundleValue;
          
          // Force re-render to update all bundle items with new state
          // This ensures:
          // 1. The newly selected item shows as active (border + radio dot)
          // 2. The previously selected item shows as inactive (no border, no radio dot)
          // 3. All other items remain inactive
        this.renderContent();
        }
        return false;

      case "update-seats":
      case "update-storage":
      case "seats":
      case "storage":
      case _a.input:
        // Handle seats or storage input changes in checkout
        // Entry fields can trigger with custom service or default _a.input
        // When using _a.input, we need to get field name from cmd.name
        let field = null;
        
        // Try to get field name from service first
        if (service === "update-seats" || service === "seats") {
          field = "seats";
        } else if (service === "update-storage" || service === "storage") {
          field = "storage";
        } else if (service === _a.input) {
          // When service is _a.input (default), get field name from cmd.name
          const cmdName = (cmd.mget && cmd.mget(_a.name)) || 
                         (cmd.get && cmd.get(_a.name)) || 
                         cmd.name ||
                         (cmd.model && cmd.model.get(_a.name));
          if (cmdName === "seats" || cmdName === "storage") {
            field = cmdName;
          }
        } else {
          // Fallback: try to get from cmd.name
          const cmdName = (cmd.mget && cmd.mget(_a.name)) || (cmd.get && cmd.get(_a.name)) || cmd.name;
          if (cmdName === "seats" || cmdName === "storage") {
            field = cmdName;
          }
        }
        
        if (field) {
          // Try multiple ways to get value
          // When using _a.input, value might be in args, cmd, or directly from DOM
          let value = null;
          
          // Method 1: Get value directly from input field DOM element (most reliable for real-time typing)
          // Entry input fields have _input property that points to jQuery element
          if (cmd && cmd._input && typeof cmd._input.val === 'function') {
            value = cmd._input.val();
          } else if (cmd && typeof cmd.getValue === 'function') {
            // Try getValue method if available
            value = cmd.getValue();
          } else if (cmd && cmd._id) {
            // Fallback: get from DOM element directly
            const inputEl = document.getElementById(`${cmd._id}-input`);
            if (inputEl) {
              value = inputEl.value;
            }
          }
          
          // Method 2: From args (when triggered by input field)
          if (value == null && args && args[field] != null) {
            value = args[field];
          } else if (value == null && args && args.value != null) {
            value = args.value;
          }
          
          // Method 3: From cmd model (may be stale during typing)
          if (value == null && cmd && cmd.model) {
            value = cmd.model.get(_a.value) || cmd.model.get('value');
          }
          
          // Method 4: From cmd directly
          if (value == null && cmd) {
            value = (cmd.mget && cmd.mget(_a.value)) || 
                    (cmd.get && cmd.get(_a.value)) || 
                    cmd.value;
          }
          
          // Method 5: From args with field name
          if (value == null && args) {
            value = args[field];
          }
          
          // Only update if we have a valid value
          // Allow empty string (0) for storage field
          if (value != null && value !== undefined) {
            // Convert to number, allow 0
            const numValue = parseInt(value);
            if (!isNaN(numValue) && numValue >= 0) {
              this.state.checkout[field] = numValue;
              this.debug(`Checkout ${field} changed to:`, this.state.checkout[field], "value:", value, "source:", value ? "DOM" : "other");
              
              // Only update right panel (summary), don't re-render entire content
              // This prevents input fields from being reset while user is typing
              this.updateRightPanel();
            }
          }
        }
        return false;

      case "proceed-checkout-billing":
        // Handle proceed to checkout button - integrate payment API
        this.debug("proceed-checkout service matched, calling _proceedToCheckout");
        this._proceedToCheckout();
        return false; // Prevent bubbling to parent

      default:
        // Let parent handle other services
        return super.onUiEvent(cmd, args);
    }
  }
}


module.exports = settings_billing
