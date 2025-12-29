

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
    }
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

  /**
   * Handle UI events
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || (cmd.mget && cmd.mget(_a.service)) || (cmd.get && cmd.get(_a.service)) || cmd.mget(_a.name) || cmd.get(_a.name);
    this.debug("Billing onUiEvent:", service, "cmd:", cmd);
    this.debug("AAA:165", service);
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
        // Handle seats or storage input changes in checkout
        const field = service === "update-seats" ? "seats" : "storage";
        const value = (cmd.mget && cmd.mget(_a.value)) || (cmd.get && cmd.get(_a.value)) || 
                      cmd.value || args.value;
        if (value != null && !isNaN(parseInt(value))) {
          this.state.checkout[field] = parseInt(value) || 0;
          this.debug(`Checkout ${field} changed to:`, this.state.checkout[field]);
          this.renderContent();
        }
        return false;

      case "proceed-checkout":
        // Handle proceed to checkout button
        this.debug("Proceeding to checkout with state:", this.state.checkout);
        // TODO: Implement actual checkout logic
        return false;

      default:
        // Let parent handle other services
        return super.onUiEvent(cmd, args);
    }
  }
}


module.exports = settings_billing
