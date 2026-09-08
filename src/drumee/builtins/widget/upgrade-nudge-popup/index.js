/**
 * Upgrade-nudge popup — "Your workspace is growing" (Figma: Upgrade Trigger).
 *
 * One widget, three faces keyed by the trigger family the server granted:
 *
 *   storage   usage crossed 70/80/90% of the plan's disk — headline number,
 *             tinted progress bar (amber, red at 90).
 *   seats     members+invites crossed 70/90% of the seat cap — "Invited
 *             n / cap seats" bar.
 *   age       the workspace turned 14 then 30 days old — no bar, just the
 *             benefits of the next tier.
 *
 * The server (payment.upgrade_nudge_state → lib/upgrade-nudge + the yp gate
 * proc) owns EVERY decision: which threshold, once per threshold per
 * workspace, the shared daily cap, "until upgraded". A granted answer is
 * already marked shown server-side, so this widget renders what it was
 * handed and never writes anything back — closing is purely local.
 *
 * Mechanics cloned from over-limit-popup/promo-launch30: portalled to
 * <body> (Wm renders inside window-manager, z-auto), fixed backdrop,
 * Wm.launch singleton. The payload rides in as the `nudge` model attribute.
 */
class __upgrade_nudge_popup extends LetcBox {
  static initClass() {
    require("./skin");
  }

  /** Wm.launch({singleton:1}) reuses the instance and calls .raise(). */
  raise() {
    if (this.el) {
      this.el.style.display = "";
      this.el.style.zIndex = 99998;
    }
    return this;
  }

  onDomRefresh() {
    this._portalToBody();
    this.feed(require("./skeleton")(this));
  }

  onBeforeDestroy() {
    if (this.el && this.el.parentElement === document.body) {
      document.body.removeChild(this.el);
    }
  }

  _portalToBody() {
    if (!this.el) return;
    if (this.el.parentElement !== document.body) {
      document.body.appendChild(this.el);
    }
  }

  nudge() {
    return this.mget("nudge") || {};
  }

  _close() {
    if (this.parent && _.isFunction(this.parent.clear)) this.parent.clear();
    else this.softDestroy();
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "upgrade-nudge-cta": {
        // The billing screen belongs to the desk; the popup raises the same
        // broadcast the sidebar's "Upgrade plan" would and gets out of the
        // way. Preselect the tier the nudge was selling.
        const target = this.nudge().target_plan;
        this._close();
        RADIO_BROADCAST.trigger("desk:open-billing-page", target ? { plan: target } : undefined);
        return;
      }

      // X and "Not now" are the same local close: the threshold was marked
      // shown when the server granted it, so there is nothing to persist.
      case "upgrade-nudge-dismiss":
        return this._close();

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__upgrade_nudge_popup.initClass();
module.exports = __upgrade_nudge_popup;
