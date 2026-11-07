/**
 * Downgrade over-limit popup — "Plan changed, action needed".
 *
 * Shown while the workspace is over its downgraded plan's storage and/or
 * seat limit (libs/over-limit holds the derived state; the server owns the
 * decision). Two faces, picked by OverLimit.isOwner():
 *
 *   owner        violations with exact numbers and the storage shortcuts,
 *                "Resolve now" + "Remind me later" (server-side snooze —
 *                never localStorage). Both buttons in every state.
 *   anyone else  the same numbers, "Contact the workspace owner at
 *                <owner_email> to resolve it.", and Close.
 *
 * Mechanics cloned from promo-launch30: portalled to <body> (Wm renders
 * inside window-manager, z-auto), fixed backdrop, Wm.launch singleton.
 * Re-renders live on RADIO_BROADCAST over-limit:changed — resolution while
 * the popup is open closes it by itself.
 */
const OverLimit = require("libs/over-limit");
const { closeWmPopup } = require("libs/wm-popup");
const { resolveLanded } = require("./landed");

// A pending CTA closes the card when its destination is up — or after this,
// so a refused or slow open never leaves the card spinning for good.
const PENDING_TIMEOUT_MS = 8000;

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
    // Closing by choice (a CTA released the backdrop and is finishing): a
    // re-launch meanwhile — a locked tile clicked through the released
    // backdrop — must not put the page fade back over the screen it opened.
    if (this._closing) return this;
    if (this.el) {
      this.el.style.display = "";
      this.el.style.zIndex = 99998;
    }
    this._fitToContainer();
    this._stampDesk(true);
    return this;
  }

  onDomRefresh() {
    this._portalToBody();
    this._render();
    this._watchContainer();
    this._stampDesk(true);
    this._bindOutsideNudge();
    // A read-only notice raised before the popup (a refused request at boot)
    // would sit behind it as a second modal with its own grey scrim.
    OverLimit.dismissNotice();
  }

  /**
   * A click OUTSIDE the card never closes it and runs nothing — the popup is
   * a decision the user has to make ("Resolve now" / "Remind me later"). It
   * answers by highlighting the card instead, so the click doesn't read as
   * dead. Native listener on the popup root: the backdrop has no service, and
   * the card is re-fed on every state change, so it is looked up per click.
   */
  //
  // DOCUMENT-level capture, not a listener on the popup root: the root is a
  // Wm item and does not reliably cover the whole viewport — the desk topbar
  // and the sidebar rail stayed clickable around it. Capturing at the window
  // stops every press outside the card, wherever it lands and whatever its
  // stacking, before any desk handler sees it. Butler is let through: a
  // dialog the popup itself raises (sign-out) must stay usable.
  _bindOutsideNudge() {
    if (this._onOutsidePointer || !this.el) return;
    const fig = this.fig.family;
    const outside = (e) => {
      if (this.isDestroyed && this.isDestroyed()) return null;
      const card = this.el && this.el.querySelector(`.${fig}__card`);
      if (!card || !card.isConnected) return null;
      const t = e.target;
      if (!(t instanceof Node) || card.contains(t)) return null;
      if (t.closest && t.closest(".router-butler__ui, .router-butler__main")) return null;
      return card;
    };
    // The press that starts the gesture: block it and highlight the card.
    this._onOutsidePointer = (e) => {
      const card = outside(e);
      if (!card) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      // Restart the animation on every click, even mid-run: drop the stamp,
      // force a reflow, stamp again.
      delete card.dataset.nudge;
      void card.offsetWidth;
      card.dataset.nudge = "1";
      clearTimeout(this._nudgeTimer);
      this._nudgeTimer = setTimeout(() => {
        if (card.isConnected) delete card.dataset.nudge;
      }, 700);
    };
    // The rest of the gesture: swallowed silently, so a handler bound to
    // mousedown / pointerup / click (ui-core's are) never runs either.
    this._onOutsideSwallow = (e) => {
      if (!outside(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
    };
    this._swallowTypes = ["mousedown", "mouseup", "pointerup", "click", "dblclick", "contextmenu", "touchstart", "touchend"];
    window.addEventListener("pointerdown", this._onOutsidePointer, true);
    for (const t of this._swallowTypes) {
      window.addEventListener(t, this._onOutsideSwallow, { capture: true, passive: false });
    }
  }

  _unbindOutsideNudge() {
    if (this._onOutsidePointer) {
      window.removeEventListener("pointerdown", this._onOutsidePointer, true);
    }
    if (this._onOutsideSwallow) {
      for (const t of this._swallowTypes || []) {
        window.removeEventListener(t, this._onOutsideSwallow, { capture: true });
      }
    }
    this._onOutsidePointer = null;
    this._onOutsideSwallow = null;
    clearTimeout(this._nudgeTimer);
  }

  onBeforeDestroy() {
    if (this._landObserver) this._landObserver.disconnect();
    clearTimeout(this._pendingTimer);
    this._unwatchContainer();
    this._unbindOutsideNudge();
    this._stampDesk(false);
    RADIO_BROADCAST.off(OverLimit.CHANGED, this._onStateChanged);
    if (this.el && this.el.parentElement === document.body) {
      document.body.removeChild(this.el);
    }
    this._respawnIfRecycled();
  }

  /**
   * DESTROYED BY SOMEONE ELSE — COME BACK.
   *
   * Wm.launch({explicit}) appends this popup to Wm.getWindowsPool(), which is
   * the HEADLESS LAYER whenever a workspace pane is open (libs/wm-popup). The
   * desk recycles that layer wholesale: Wm.loadWorkspace re-feeds it,
   * Desk.onWorkspaceClosed clears it, Wm.reload() rebuilds every layer. Each
   * one destroyed the card with the pane — the portal to <body> moves the
   * element, not the view's membership of the pool.
   *
   * The organisation screen hits this on every boot for an org account: the
   * landing (_landOnOrgView) opens the default workspace UNDER the screen, and
   * the feed that draws that pane took the popup down with it — "the popup is
   * missing on desk-org-view__main". Same cause the live call window was moved
   * to its own layer for (Wm.getCallPool).
   *
   * Only a close the user chose (_close: a CTA, "Remind me later", the lock
   * clearing) sets `_closing`; any other destroy while the workspace is still
   * locked re-launches the singleton. Deferred a tick: Wm.launch's singleton
   * lookup would otherwise find this dying instance and raise() it.
   */
  _respawnIfRecycled() {
    if (this._closing) return;
    let due = false;
    try {
      due = OverLimit.enforcementOn() && OverLimit.isLocked();
    } catch (e) { /* lib unavailable — leave it closed */ }
    if (!due) return;
    console.info("[over-limit] popup destroyed by a layer recycle; re-opening");
    setTimeout(() => RADIO_BROADCAST.trigger("desk:open-over-limit-popup"), 0);
  }

  _portalToBody() {
    if (!this.el) return;
    if (this.el.parentElement !== document.body) {
      document.body.appendChild(this.el);
    }
  }

  _render() {
    this.feed(require("./skeleton")(this));
    this._fitToContainer();
  }

  /**
   * CENTRED ON THE WORKSPACE AREA, not the viewport: the backdrop (the
   * flex box that centres the card) takes the rect of
   * `.desk-module__wm-container` — the canvas right of the sidebar and below
   * the topbar. The popup root stays fixed, full-viewport and portalled to
   * <body>; only the centring box moves. No container (another module) →
   * the full viewport, as before.
   */
  _fitToContainer() {
    try {
      const box = this.el && this.el.querySelector(`.${this.fig.family}__backdrop`);
      if (!box) return;
      const host = document.querySelector(".desk-module__wm-container");
      const r = host && host.getBoundingClientRect();
      if (!r || r.width < 1 || r.height < 1) {
        box.style.inset = "";
        box.style.top = box.style.left = box.style.width = box.style.height = "";
        return;
      }
      box.style.inset = "auto";
      box.style.top = `${r.top}px`;
      box.style.left = `${r.left}px`;
      box.style.width = `${r.width}px`;
      box.style.height = `${r.height}px`;
    } catch (e) { /* cosmetic */ }
  }

  /** Re-fit when the container or the window changes size. */
  _watchContainer() {
    if (this._fitBound) return;
    this._fitBound = () => this._fitToContainer();
    window.addEventListener("resize", this._fitBound);
    const host = document.querySelector(".desk-module__wm-container");
    if (host && typeof ResizeObserver === "function") {
      this._fitObserver = new ResizeObserver(this._fitBound);
      this._fitObserver.observe(host);
    }
  }

  _unwatchContainer() {
    if (this._fitBound) window.removeEventListener("resize", this._fitBound);
    if (this._fitObserver) this._fitObserver.disconnect();
    this._fitBound = null;
    this._fitObserver = null;
  }

  /**
   * Page-fade backdrop: mark the desk root while the popup is up, naming what
   * it sits on — the same two cases as settings_billing_result's
   * `data-billing-result`, and the same desk/skin rules answer both:
   *
   *   screen  a full-canvas screen (Billing, Settings…) is up: it fades and
   *           the workspace layer beneath it is hidden, or it shows through.
   *   pane    nothing covers the workspace: the pane itself fades.
   *
   * The card is portalled to <body>, outside every faded layer, so it stays
   * at full strength.
   */
  _stampDesk(on) {
    try {
      const root = document.querySelector(".desk-module");
      if (!root) return;
      if (!on) {
        this._unwatchScreen();
        delete root.dataset.overLimitPopup;
        return;
      }
      const desk = window.Desk;
      const onScreen = !!(desk && _.isFunction(desk._mainScreenOnTop) && desk._mainScreenOnTop());
      root.dataset.overLimitPopup = onScreen ? "screen" : "pane";
      this._watchScreen(root);
    } catch (e) { /* cosmetic */ }
  }

  /**
   * The popup opens from the boot chain, and a full-canvas screen (Calendar,
   * Billing…) can be restored or opened AFTER it — a stamp read once stays
   * "pane", fades the hidden workspace and leaves the screen at full strength.
   * Re-read whenever the settings-main-slot gains/loses a child or flips its
   * data-anim, the same signals desk._installLocationUrlWatch follows.
   */
  _watchScreen(root) {
    if (this._screenObserver || typeof MutationObserver !== "function") return;
    const slot = root.querySelector(".desk-module__settings-main-slot");
    if (!slot) return;
    this._screenObserver = new MutationObserver(() => {
      if (this.isDestroyed && this.isDestroyed()) return this._unwatchScreen();
      if (root.dataset.overLimitPopup) this._stampDesk(true);
    });
    this._screenObserver.observe(slot, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-anim"],
    });
  }

  _unwatchScreen() {
    if (this._screenObserver) this._screenObserver.disconnect();
    this._screenObserver = null;
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
    // A close the user chose — onBeforeDestroy must not bring it back.
    this._closing = true;
    // Unfade now, not at destroy: goodbye() destroys on a timer, and every
    // CTA navigates right after closing — the screen it opens must not land
    // under a 20% page.
    this._stampDesk(false);
    // Release the page now, not at destroy: goodbye() destroys on a timer and
    // the CTA's own navigation must not be swallowed meanwhile.
    this._unbindOutsideNudge();
    closeWmPopup(this);
  }

  /**
   * A CTA was pressed and is now working: remember which (the skeleton stamps
   * its data-loading from this) and redraw the card.
   */
  _setPending(service) {
    this._pendingService = service;
    this._render();
  }

  /**
   * TAKE THE BACKDROP OFF NOW, keep the card. The page fade goes, the
   * outside-click block is released, and the popup root stops taking clicks
   * (data-backdrop="off" → pointer-events: none): the destination the CTA
   * opens is usable while the card finishes. Marked as a chosen close, so a
   * layer recycle meanwhile does not bring the popup back.
   */
  _releaseBackdrop() {
    this._closing = true;
    this._stampDesk(false);
    this._unbindOutsideNudge();
    if (this.el) this.el.dataset.backdrop = "off";
  }

  /** The card's own close, once the pending action is over. */
  _finishClose() {
    if (this._finished) return;
    this._finished = true;
    if (this._landObserver) this._landObserver.disconnect();
    this._landObserver = null;
    clearTimeout(this._pendingTimer);
    closeWmPopup(this);
  }

  /** Close the card when "Resolve now"'s screen is on (./landed) or on timeout. */
  _closeWhenLanded() {
    const check = () => {
      if (this.isDestroyed && this.isDestroyed()) return this._finishClose();
      if (resolveLanded(document)) this._finishClose();
    };
    if (typeof MutationObserver === "function" && document.body) {
      this._landObserver = new MutationObserver(check);
      this._landObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["data-anim"],
      });
    }
    clearTimeout(this._pendingTimer);
    this._pendingTimer = setTimeout(() => this._finishClose(), PENDING_TIMEOUT_MS);
    check();
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case "over-limit-resolve": {
        // One press: the console is a lazy chunk and can take seconds.
        if (this._pendingService) return;
        // Spin, take the backdrop off, navigate — the card closes itself once
        // the screen it opened is up (_closeWhenLanded).
        this._setPending("over-limit-resolve");
        this._releaseBackdrop();
        // OverLimit.resolveTarget() picks the destination, shared with the
        // top banner: a storage overage opens the console's Storage tab on
        // EVERY plan (per-workspace usage, delete from there — Free/Pro are
        // let through for this case, 2026-11-05); seats only opens Members
        // where the plan has the console.
        //
        // Seats only on Free/Pro (libs/billing.needsAdminConsoleUpgrade) gets
        // null — the console would only be an upsell. They go to the
        // ORGANISATION SCREEN instead (2026-09-16): it is gated on membership
        // and role, never tier, and lists every workspace in the org — the
        // index to work through.
        const target = OverLimit.resolveTarget();
        if (target) {
          RADIO_BROADCAST.trigger(target.event, target.arg);
        } else {
          RADIO_BROADCAST.trigger("desk:open-org-view");
        }
        this._closeWhenLanded();
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
        if (this._pendingService) return;
        // Spin and release the backdrop now; the card goes when the snooze
        // has been recorded (or failed — it closes either way).
        this._setPending("over-limit-later");
        this._releaseBackdrop();
        Promise.resolve(this.postService(SERVICE.payment.over_limit_dismiss, {
          hub_id: Visitor.id,
        }))
          .catch((e) => this.warn && this.warn("[over-limit] dismiss failed", e))
          .finally(() => this._finishClose());
        return;

      // Non-owner face: nothing to resolve, so a plain close. No snooze —
      // that is the owner's, server-side; the boot rule decides next time.
      case "over-limit-close":
        return this._close();

      case "over-limit-signout":
        // Logout tears the desk down; that destroy must not re-launch the card.
        this._closing = true;
        return Butler && Butler.logout && Butler.logout();

      default:
        if (super.onUiEvent) return super.onUiEvent(cmd, args);
    }
  }
}

__over_limit_popup.initClass();
module.exports = __over_limit_popup;
