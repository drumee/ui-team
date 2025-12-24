

/**
 * 
 * 
 */
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
    this.tab = 0
  }

  /**
   * 
   */
  getViewMode() {
    return _a.grid;
  }
  /**
   *
   */
  onDomRefresh() {
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
    }
  }

  /**
   * Re-render content based on current tab
   */
  renderContent() {
    // Re-render entire skeleton to update both header (tab states) and content
    this.feed(require("./skeleton").default(this));
  }

  /**
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || (cmd.mget && cmd.mget(_a.service)) || (cmd.get && cmd.get(_a.service)) || cmd.mget(_a.name) || cmd.get(_a.name);
    this.debug("Billing onUiEvent:", service, "cmd:", cmd, "args:", args);
    
    switch (service) {
      case "select-plan":
        // Get tab position from cmd - works for all tabs including checkout (pos=2)
        const pos = (cmd.mget && cmd.mget(_a.pos)) || (cmd.get && cmd.get(_a.pos)) || 
                    (cmd.mget && cmd.mget(_a.value)) || (cmd.get && cmd.get(_a.value)) ||
                    cmd.pos || cmd.value;
        this.debug("Select plan pos:", pos, "current tab:", this.tab);
        
        if (pos != null) {
          const posNum = parseInt(pos);
          if (posNum !== this.tab) {
            this.tab = posNum;
            // Re-render content based on tab
            this.renderContent();
          }
        }
        // Prevent bubbling
        return false;

      case "checkout":
        // Handle checkout service - switch to tab 2 (checkout view)
        this.debug("Checkout service triggered, switching to tab 2");
        this.tab = 2;
        this.renderContent();
        // Prevent bubbling
        return false;

      default:
        // Let parent handle other services
        return super.onUiEvent(cmd, args);
    }
  }


}


module.exports = settings_billing
