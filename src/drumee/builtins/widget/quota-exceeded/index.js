/**
 * Quota-exceeded widget.
 *
 * Explains which limit the user hit and, when they can act on it, hands them
 * the billing screen. See ./skeleton for the copy matrix and the can-upgrade
 * rule; this file is only the shell and the two service handlers.
 */
const skeleton = require("./skeleton");
const { canUpgradePlan } = require("libs/billing");

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
        // Second whitelist on the same journey (Wm.openQuotaExceeded has the
        // first). Both have to name a flag or it never reaches the copy.
        free: !!this.mget("free"),
      })
    );
  }

  async onUiEvent(cmd, args = {}) {
    const service = (cmd && cmd.mget && cmd.mget("service")) || args.service;

    if (service === "quota-exceeded-close") {
      // Only meaningful in the modal host; inline never renders a Close.
      // Wm.closeQuotaExceeded, not a bare clear(): emptying the host while it
      // still carries data-state="open" leaves a full-viewport invisible
      // blocker over the desk.
      if (typeof Wm !== "undefined" && Wm.closeQuotaExceeded) Wm.closeQuotaExceeded();
      return;
    }

    /**
     * "See plans" — the same journey the sidebar's Upgrade plan entry takes.
     *
     * That entry is built with `uiHandler: [ui]` where ui is the DESK, so its
     * click lands directly on the desk's `case "upgrade-plan"`. This button
     * cannot do that: its handler is this widget, and the widget is mounted
     * inside Wm's wrapper-modal — so the event was left to bubble and reached
     * either Wm or nothing at all, depending on where the card was hosted.
     * Inline, in the members panel or the create-workspace form, "nothing at
     * all" is the likely answer, and the button silently did nothing.
     *
     * Handled explicitly instead, ending at the SAME place both existing
     * routes converge on: the sidebar hits desk.openBillingPage() directly,
     * Wm.upgradePlage() broadcasts desk:open-billing-page, and the desk
     * listens for that broadcast and calls the very same method. Using the
     * broadcast works from any host, which is what this widget needs.
     *
     * canUpgradePlan() is re-checked to match the desk's own guard on that
     * case. The button is only rendered when it passes, so this is defence in
     * depth against a stale card left open across a plan change — the same
     * reason the desk guards a route its own sidebar already gates.
     */
    if (service === "upgrade-plan") {
      if (!canUpgradePlan()) return;
      // Take the card down first. It is a full-viewport host: left open it
      // would sit over the billing page it just navigated to, and go on
      // swallowing every click on it.
      if (typeof Wm !== "undefined" && Wm.closeQuotaExceeded) Wm.closeQuotaExceeded();
      RADIO_BROADCAST.trigger("desk:open-billing-page");
      return;
    }

    this.triggerHandlers(args);
  }
}

// MUST be called, not just defined. `static initClass()` is not a framework
// hook — @drumee/ui-core's own widgets (and invite-popup, reward-flow here)
// invoke it explicitly at module bottom, and that call is the only thing that
// requires the skin. Without it the class loaded fine and rendered completely
// unstyled: a full-size SVG and the buttons run together as plain text.
__quota_exceeded.initClass();
module.exports = __quota_exceeded;
