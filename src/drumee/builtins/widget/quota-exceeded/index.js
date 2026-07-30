/**
 * Quota-exceeded widget.
 *
 * Explains which limit the user hit and, when they can act on it, hands them
 * the billing screen. See ./skeleton for the copy matrix and the can-upgrade
 * rule; this file is only the shell and the two service handlers.
 */
const skeleton = require("./skeleton");

class __quota_exceeded extends LetcBox {
  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
  }

  onDomRefresh() {
    this.feed(
      skeleton(this, {
        limit: this.mget("limit"),
        used: this.mget("used"),
        cap: this.mget("cap"),
        inline: !!this.mget("inline"),
      })
    );
  }

  /**
   * `upgrade-plan` is NOT handled here — it is deliberately allowed to bubble.
   *
   * The desk owns that route (modules/desk `case "upgrade-plan"` ->
   * openBillingPage), and every other entry point in the product reaches the
   * billing screen the same way. Catching it here to navigate ourselves would
   * be a second implementation of the same journey, free to drift from the one
   * the sidebar uses — and it would bypass the desk's own canUpgradePlan guard.
   */
  async onUiEvent(cmd, args = {}) {
    const service = (cmd && cmd.mget && cmd.mget("service")) || args.service;
    if (service === "quota-exceeded-close") {
      // Only meaningful in the modal host; inline never renders a Close.
      Wm.ensurePart("wrapper-modal").then((p) => p && p.clear());
      return;
    }
    this.triggerHandlers(args);
  }
}

module.exports = __quota_exceeded;
