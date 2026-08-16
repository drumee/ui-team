/**
 * Activation Step 2 — the invite surfaces, and watching them.
 *
 * NOT A GUIDE, despite the filename it sits beside. The other two steps are
 * walkthroughs: a reconcile engine reads the DOM and re-points a spotlight at
 * whichever sub-step the user has reached (see libs/guided-flow/guide-core).
 * Step 2 has no sub-steps. It hands the user one surface and waits for it to go
 * away, and everything interesting is in deciding WHY it went away. So this is
 * an observer, and the orchestrator says what the answers mean.
 *
 * It exists as a module at all because reward-flow keeps this machinery loose in
 * its orchestrator, where it accounts for something like a fifth of the file and
 * is entangled with the campaign's own concerns. Pulled out, Step 2's watching
 * is about 150 lines with one job.
 *
 * TWO ROUTES IN, and they differ in who tells us the surface appeared:
 *
 *   Route A — the permission panel. Step 1's walkthrough ends on it for an
 *     internal (team) workspace, because that panel is where members are
 *     invited, so it IS Step 2. Nothing reports it: the desk reports the invite
 *     popup for itself but not this, so awaitPanelClosed observes the document.
 *
 *   Route B — the invite popup, opened from the Step 2 card through the desk's
 *     "invite-member" service. The desk owns it and relays both its success and
 *     its destruction to the orchestrator, so the only thing left to watch is
 *     the confirmation that replaces it — awaitToastDismissed.
 *
 * WHAT COUNTS AS SUCCESS is deliberately not "a confirmation appeared". A FAILED
 * invite raises a window_info of its own (permission_restricted's error path
 * calls Wm.alert), so sniffing for one reads a failure as a completed step. The
 * signal is permission_restricted's own "invitation:sent" broadcast, which it
 * only fires once the server has said yes.
 */

// The surfaces Step 2 hands the user to, all fed into the shared wrapper-modal:
// the internal permission panel Step 1 ends on OR the invite popup, then the
// invite-sent confirmation that REPLACES either of them on a successful send
// (Wm.alert → window_info). A click on any of them is the user working; a click
// beside them is the abandon gesture the flow guards.
const INVITE_POPUP = ".invite-popup__container";
const INVITE_PANEL = ".permission-restricted__main";
const INVITE_TOAST = ".window-info__ui, .window-info__main";
const STEP2_SURFACES = `${INVITE_POPUP}, ${INVITE_PANEL}, ${INVITE_TOAST}`;
// What Route A waits on: the panel itself, or the confirmation that replaced it.
// Both gone = the step is over.
const PANEL_SURFACES = `${INVITE_PANEL}, ${INVITE_TOAST}`;
// The same pair for Route B. This is what the cutout spotlights while that route
// is waiting — see the orchestrator's _applyStepTarget.
const POPUP_SURFACES = `${INVITE_POPUP}, ${INVITE_TOAST}`;

// The popup's own dropdowns, which are absolutely positioned and hang PAST its
// bottom edge (see its skin: `position: absolute; top: calc(100% + 4px)` with a
// max-height of its own). A hole cut to the popup alone leaves an open list half
// lit and half in the dim, so the hole takes them in. Each is
// `visibility: hidden` until `data-state="1"`, so presence is not enough: they
// have to be measured for real visibility.
const POPUP_OVERFLOW = [
  ".invite-popup__suggestions",            // email suggestions
  ".invite-popup__workspace-suggestions",  // "Search workspace to add"
  ".invite-popup__role-options",           // the per-row role menu
].join(", ");

/**
 * How long Route A waits for a panel it has been told to expect.
 *
 * Generous because the panel's kind is lazily imported, so the chunk has to be
 * fetched before anything mounts. The cost of waiting too long is a late card;
 * the cost of waiting too little is ending a step the user never got to see.
 */
const PANEL_OPEN_TIMEOUT_MS = 8000;

/**
 * How long Route B waits for a confirmation that may never come.
 *
 * The toast is fed asynchronously by invite-popup's Wm.alert AFTER the popup is
 * destroyed, so its absence at first look means nothing. If it never shows —
 * Wm.alert failed, the kind did not load — the flow advances anyway rather than
 * stranding the user on a step whose work is done.
 */
const TOAST_TIMEOUT_MS = 4000;

class InviteSurfaces {
  /** @param {Object} ui the orchestrator. Must expose markInviteToast() and
   *  trackStepTarget(); isDestroyed() is used when present. */
  constructor(ui) {
    this._ui = ui;
    // An invitation really went out from the PANEL. Latched off the broadcast
    // rather than read from the DOM — see the module docblock on why a
    // confirmation is not evidence.
    this._sent = false;
    this._panelObs = null;
    this._panelTimer = null;
    this._toastObs = null;
    this._toastTimer = null;
    this._onBroadcast = null;
  }

  // ───────── route A: the permission panel ─────────

  /**
   * Hold Step 2 while the user works the permission panel, and report which way
   * it ended.
   *
   * Watches the DOCUMENT, not the wrapper-modal the panel happens to be in
   * today: pinning the host would make a panel opened anywhere else either hang
   * the step for good (no mutations on the watched host) or end it on the first
   * unrelated one. The walkthroughs observe document.body for the same reason.
   *
   * Absence is only read as a close once the panel has actually been SEEN.
   * Without that latch a caller who has just asked for the panel — whose kind is
   * lazily imported — would end the step on the frame it armed, reading "not
   * yet" as "already gone".
   *
   * @param {{onSent: Function, onClosed: Function, onMissing: Function}} exits
   *   onSent    an invitation went out; the step is complete.
   *   onClosed  the panel was closed with nothing sent.
   *   onMissing it never arrived within PANEL_OPEN_TIMEOUT_MS.
   */
  awaitPanelClosed({ onSent, onClosed, onMissing } = {}) {
    this.stopPanelWatch();
    this._sent = false;
    this._listen();

    const onScreen = () =>
      typeof document !== "undefined" && !!document.querySelector(PANEL_SURFACES);

    const finish = (cb) => {
      const sent = this._sent;
      this.stopPanelWatch();
      this._sent = false;
      if (typeof cb === "function") cb(sent);
    };

    if (typeof MutationObserver === "undefined") {
      // Nothing to watch with → don't strand the user on a step that can then
      // never end. The CLOSED exit, not the sent one: we have no evidence an
      // invitation went out, and the card that exit lands on carries both a
      // retry and a Skip, where onSent would silently credit a step nobody
      // completed.
      return finish(onClosed);
    }

    let seen = onScreen();
    this._panelObs = new MutationObserver(() => {
      if (!onScreen()) {
        if (!seen) return;
        return finish(this._sent ? onSent : onClosed);
      }
      seen = true;
      // The panel gone with something still up means the invite-sent
      // confirmation has replaced it — step the card aside for it.
      this._ui.markInviteToast(!document.querySelector(INVITE_PANEL));
      // Still there — keep the hole on it. TRACK rather than measure once: this
      // fires when the panel is inserted, which is before it has slid into
      // place, and again when the confirmation replaces it. Both arrive
      // animating. Safe against feedback: the cutout is driven through inline
      // CSS vars and this watches childList only, not attributes.
      this._ui.trackStepTarget();
    });
    this._panelObs.observe(document.body, { childList: true, subtree: true });

    if (!seen) {
      // Never through the sent/closed pair: their "nothing was sent" branch
      // describes a panel the user closed, and this one they never saw.
      this._panelTimer = setTimeout(() => finish(onMissing), PANEL_OPEN_TIMEOUT_MS);
    }
  }

  stopPanelWatch() {
    if (this._panelObs) {
      this._panelObs.disconnect();
      this._panelObs = null;
    }
    if (this._panelTimer) {
      clearTimeout(this._panelTimer);
      this._panelTimer = null;
    }
    this._unlisten();
  }

  // ───────── route B: the invite popup's confirmation ─────────

  /**
   * Watch the shared wrapper-modal for the invite-sent confirmation to appear
   * and then be dismissed, and only then run `done`.
   *
   * The confirmation is fed AFTER the popup is destroyed, so it is not there
   * when this arms: absence is read as "closed" only once it has been seen.
   *
   * @param {Function} done
   */
  awaitToastDismissed(done) {
    this.stopToastWatch();

    const advance = () => {
      this._ui.markInviteToast(false);
      // The observer fires DURING the toast's removal unwind; defer a microtask
      // so that collection reset settles before we touch the same host.
      Promise.resolve().then(() => {
        if (this._ui.isDestroyed?.()) return;
        if (typeof done === "function") done();
      });
    };

    const host = (typeof Wm !== "undefined" && Wm.__wrapperModal?.el) || null;
    if (!host || typeof MutationObserver === "undefined") {
      return advance(); // nothing to watch → don't strand the flow
    }

    let seen = false;
    const check = () => {
      if (host.querySelector(INVITE_TOAST)) {
        if (!seen) {
          // The confirmation has taken the popup's place in this host. Treat it
          // exactly as Route A treats its own: step the card aside (it restates
          // a step just completed, and leaves a stray Back beside a card that
          // has its own Close), and move the hole onto it — the popup it
          // replaced is gone, so a hole left on that rect lights up empty space
          // and dims the confirmation itself.
          this._ui.markInviteToast(true);
          this._ui.trackStepTarget();
        }
        seen = true;
        return;
      }
      // The toast has appeared and is now gone → the user closed it → advance.
      if (seen) {
        this.stopToastWatch();
        advance();
      }
    };

    this._toastObs = new MutationObserver(check);
    this._toastObs.observe(host, { childList: true, subtree: true });
    this._toastTimer = setTimeout(() => {
      if (seen) return;
      this.stopToastWatch();
      advance();
    }, TOAST_TIMEOUT_MS);
    check(); // it may already be present
  }

  stopToastWatch() {
    if (this._toastObs) {
      this._toastObs.disconnect();
      this._toastObs = null;
    }
    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
      this._toastTimer = null;
    }
  }

  // ───────── the success signal ─────────

  /**
   * Subscribe to permission_restricted's own "invitation:sent".
   *
   * Only while Route A is watching, so an invitation sent later — from the
   * topbar, or a settings panel, after Step 2 is over — is not this step being
   * completed. It is a RADIO_BROADCAST rather than a handler chain because that
   * panel is fed into the shared wrapper-modal and its uiHandler never reaches
   * a flow watching from outside.
   */
  _listen() {
    if (this._onBroadcast || typeof RADIO_BROADCAST === "undefined") return;
    this._onBroadcast = () => { this._sent = true; };
    RADIO_BROADCAST.on("invitation:sent", this._onBroadcast);
  }

  _unlisten() {
    if (!this._onBroadcast || typeof RADIO_BROADCAST === "undefined") return;
    RADIO_BROADCAST.off("invitation:sent", this._onBroadcast);
    this._onBroadcast = null;
  }

  /** Everything down, whatever it was doing. Called from the orchestrator's own
   *  teardown, so it must not assume either route was running. */
  stop() {
    this.stopPanelWatch();
    this.stopToastWatch();
    this._sent = false;
  }
}

module.exports = {
  InviteSurfaces,
  INVITE_POPUP,
  INVITE_PANEL,
  INVITE_TOAST,
  STEP2_SURFACES,
  PANEL_SURFACES,
  POPUP_SURFACES,
  POPUP_OVERFLOW,
  PANEL_OPEN_TIMEOUT_MS,
  TOAST_TIMEOUT_MS,
};
