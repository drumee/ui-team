/**
 * Downgrade over-limit popup — "Plan changed, action needed".
 *
 * Shown to the org Owner/Admin while the workspace is over its downgraded
 * plan's storage and/or seat limit (libs/over-limit holds the derived state;
 * the server owns the decision). Three faces, one widget:
 *
 *   over_limit + admin   both violations listed with exact numbers, CTAs
 *                        "Resolve now" / "Remind me later" (server-side
 *                        snooze — never localStorage).
 *   hard_lock + admin    same numbers, non-dismissible: no later, no X, no
 *                        backdrop close. Only way out is resolving.
 *   hard_lock + member   dead-end wall: access is owner/admin-only now; the
 *                        member is told who can fix it and can only sign out.
 *
 * Mechanics cloned from promo-launch30: portalled to <body> (Wm renders
 * inside window-manager, z-auto), fixed backdrop, Wm.launch singleton.
 * Re-renders live on RADIO_BROADCAST over-limit:changed — resolution while
 * the popup is open closes it by itself.
 */
const OverLimit = require("libs/over-limit");
const { closeWmPopup } = require("libs/wm-popup");

class __over_limit_popup extends LetcBox {
  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    this._onStateChanged = this._onStateChanged.bind(this);
    RADIO_BROADCAST.on(OverLimit.CHANGED, this._onStateChanged);
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
    this._render();
  }

  onBeforeDestroy() {
    RADIO_BROADCAST.off(OverLimit.CHANGED, this._onStateChanged);
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

  _render() {
    this.feed(require("./skeleton")(this));
  }

  _onStateChanged() {
    if (this.isDestroyed && this.isDestroyed()) return;
    // Fully resolved → the popup's reason to exist is gone. Both flags clear
    // remove the block server-side, so current() turns null.
    if (!OverLimit.isLocked()) return this._close();
    this._render();
  }

  // Removes ONLY this popup when the Wm pool it lives in also holds the
  // workspace pane — see libs/wm-popup. Closing used to `parent.clear()` the
  // shared layer, which took the workspace down with the card.
  _close() {
    closeWmPopup(this);
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "over-limit-resolve": {
        this._close();
        // Plans WITH the console: OverLimit.resolveTarget() picks the tab —
        // Storage for a storage overage (per-workspace usage, delete from
        // there), Members for seats only. Shared with the top banner.
        //
        // Free/Pro sit below the console (libs/billing.needsAdminConsoleUpgrade)
        // and dropping to one is precisely how an account lands here, so for
        // them the console would only be an upsell. They go to the
        // ORGANISATION SCREEN instead (2026-09-16): it is gated on membership
        // and role, never tier, and lists every workspace in the org — the
        // index to work through.
        const target = OverLimit.resolveTarget();
        if (target) {
          RADIO_BROADCAST.trigger(target.event, target.arg);
          return;
        }
        RADIO_BROADCAST.trigger("desk:open-org-view");
        return;
      }

      // Storage destinations (see the skeleton's storageDestinations): the
      // desk owns these screens, so the popup raises the same broadcasts the
      // sidebar items would and closes — it never navigates by itself.
      case "over-limit-goto-home":
        this._close();
        RADIO_BROADCAST.trigger("desk:open-home");
        return;

      case "over-limit-goto-trash":
        this._close();
        RADIO_BROADCAST.trigger("desk:open-trash");
        return;

      case "over-limit-goto-storage":
        this._close();
        // Land on the tab that breaks usage down per workspace, not on the
        // console's default Member tab. Guarded in the skeleton too — the
        // option is not offered where the plan has no console.
        RADIO_BROADCAST.trigger("desk:open-admin-console", { tab: "storage" });
        return;

      case "over-limit-later":
        // Server-side per-admin snooze; the block itself is untouched and the
        // read-only banner stays. payment.* survives the REST clamp.
        this.postService(SERVICE.payment.over_limit_dismiss, {
          hub_id: Visitor.id,
        }).catch((e) => this.warn && this.warn("[over-limit] dismiss failed", e));
        return this._close();

      case "over-limit-signout":
        return Butler && Butler.logout && Butler.logout();

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__over_limit_popup.initClass();
module.exports = __over_limit_popup;
