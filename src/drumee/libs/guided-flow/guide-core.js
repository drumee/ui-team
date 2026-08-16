/**
 * Shared reconcile engine for live-desk walkthroughs.
 *
 * Used by every guided flow in the app — reward-flow's create-workspace and
 * upload walkthroughs, and activate-workspace's — all of which guide the user
 * through the REAL desk chrome. None of them intercepts clicks: a single
 * MutationObserver calls _reconcile(), which reads what is actually on screen
 * and re-points the spotlight at the correct sub-step. That makes every
 * off-path case self-healing — close a dropdown and it re-guides to its
 * trigger — without any per-event handlers.
 *
 * A subclass supplies:
 *   this.SEL          selector table (and SEL.otherItems when greying siblings)
 *   this.ORDER        {sub: rank}, used to tell forward from backward moves
 *   this.DISABLE_SUB  optional: the sub-step whose siblings get greyed out
 *   _resolveSub()     read the DOM, return the sub-step name, or null to HOLD
 *   _targetEl()       the element to spotlight for the current sub-step
 *   _coachFor(sub)    {text, showBack, showNext}
 *   back()            true when it handled a step-back, false to exit
 *   _pinReady()       true when a pinned transition's surface is on screen
 *   _resetState()     clear subclass-owned flags on start/stop
 *
 * All DOM work is guarded on `typeof document` so this module stays requirable
 * (and unit-testable) under Node.
 */

// Foreign-DOM annotation: a guide adds this to the desk chrome it wants greyed
// out while it holds a surface open (see _disableOthers). Not namespaced to any
// one widget — the rule that styles it ships with this engine, in
// libs/guided-flow/skin, so every consumer gets it by requiring that partial.
const DISABLED_CLASS = "guided-flow-disabled";
const RECONCILE_DEBOUNCE_MS = 30;
// How long Back may hold the guide on a sub-step while its surface animates in.
const PIN_TIMEOUT_MS = 1200;
// Moving forward applies at once; moving backward waits (see _reconcile)
// because it is nearly always just the gap between one surface closing and the
// next opening.
const BACKWARD_GRACE_MS = 500;

function hasDom() {
  return typeof document !== "undefined" && !!document.querySelector;
}

/**
 * Truly on screen right now. offsetParent is NOT enough: a topbar dropdown
 * renders its items at mount and merely toggles `visibility:hidden` when closed
 * (see topbar.scss `.menu-topic-items__wrapper`), which offsetParent can't see —
 * and it is also null for the position:fixed modal that hosts a form, which we
 * DO want to treat as visible. So:
 *   - getClientRects().length === 0  → display:none or detached  (not visible)
 *   - computed visibility === hidden → the closed dropdown         (not visible)
 * Everything else, including position:fixed, is visible.
 */
function visible(el) {
  if (!el || typeof el.getClientRects !== "function") return false;
  if (el.getClientRects().length === 0) return false;
  if (typeof getComputedStyle === "function") {
    const s = getComputedStyle(el);
    if (s?.visibility === "hidden" || s?.display === "none") return false;
  }
  return true;
}

/** First matching element that is actually on screen, else null. */
function firstVisible(selector) {
  if (!hasDom()) return null;
  for (const el of document.querySelectorAll(selector)) {
    if (visible(el)) return el;
  }
  return null;
}

class GuideCore {
  constructor(ui) {
    this._ui = ui;              // the reward_flow orchestrator
    this._sub = null;           // current sub-step name, or null
    this._observer = null;
    this._reconcileTimer = null;
    this._onResize = null;
    this._lastSig = null;       // last painted spotlight signature (dedup)
    this._pinned = null;        // Back transition in flight → hold this sub-step
    this._pinTimer = null;
    this._backwardTimer = null; // grace before accepting a backward sub-step
    this._reconcile = this._reconcile.bind(this);
    this._scheduleReconcile = this._scheduleReconcile.bind(this);
  }

  // ───────── subclass hooks (safe defaults) ─────────

  /** @returns {string|null} sub-step name, or null to hold the current one. */
  _resolveSub() { return null; }
  /** @returns {Element|null} */
  _targetEl() { return null; }
  /** `hole: false` dims the whole viewport instead of cutting the target out —
   *  for a sub-step that only asks the user to READ, where keeping a control
   *  operable would be meaningless. `nextDisabled` shows the Next but refuses
   *  it, for a beat that is not ready to be left yet.
   *  @returns {{text: string, showBack: boolean, showNext: boolean,
   *             nextDisabled?: boolean, hole?: boolean}} */
  _coachFor() { return { text: "", showBack: true, showNext: false }; }
  /** @returns {boolean} true = handled, false = the orchestrator should exit. */
  back() { return false; }
  /** @returns {boolean} the pinned sub-step's surface is actually on screen. */
  _pinReady() { return true; }
  /**
   * Clear subclass-owned flags. Called unconditionally by both start() and
   * stop(), so it must exist here — a guide with no per-run state of its own
   * simply inherits this no-op rather than being forced to declare one.
   */
  _resetState() {
    // Intentionally empty: see above.
  }

  // ───────── lifecycle ─────────

  /** Begin guiding. No-op (safe) when there is no DOM. */
  start() {
    if (!hasDom()) return;
    if (this._observer) return; // already running
    this._observer = new MutationObserver(this._scheduleReconcile);
    this._observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      // data-visible: the workspace window's "+ New" pill renders hidden until
      // syncNewCtrlVisibility() resolves the real privilege, and that flip is
      // the only mutation announcing it.
      attributeFilter: [
        "data-state",
        "data-submenu",
        "class",
        "style",
        "data-visible",
      ],
    });
    this._onResize = () => this._position();
    window.addEventListener("resize", this._onResize, { passive: true });
    this._sub = null;
    this._lastSig = null;
    // Fresh run (the guide instance is reused across Back → Continue): clear
    // subclass flags so a prior completion can't short-circuit this one.
    this._resetState();
    this._reconcile();
  }

  /** Tear everything down: observer, listeners, greyed siblings, spotlight. */
  stop() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._reconcileTimer) {
      clearTimeout(this._reconcileTimer);
      this._reconcileTimer = null;
    }
    if (this._onResize && typeof window !== "undefined") {
      window.removeEventListener("resize", this._onResize);
      this._onResize = null;
    }
    this._unpin();
    this._clearBackward();
    this._enableOthers();
    this._sub = null;
    this._lastSig = null;
    this._resetState();
    this._clearSpot();
  }

  // ───────── reconciliation ─────────

  _scheduleReconcile() {
    if (this._reconcileTimer) return;
    this._reconcileTimer = setTimeout(() => {
      this._reconcileTimer = null;
      this._reconcile();
    }, RECONCILE_DEBOUNCE_MS);
  }

  /**
   * Read the live DOM and make the spotlight match reality. Idempotent.
   * `force` accepts a backward move without the grace delay (used when a pinned
   * transition has landed, or when the grace has already elapsed).
   */
  _reconcile(force) {
    if (!hasDom() || !this._observer) return;

    // A Back transition is in flight: hold this sub-step until its surface is
    // actually on screen, so the animating gap doesn't report an earlier one.
    if (this._pinned) {
      if (!this._pinReady()) return;
      this._unpin();
      // The pinned target is what we asked for — take it without the grace.
      force = true;
    }

    const sub = this._resolveSub();
    // null = HOLD: leave the current sub-step and spotlight untouched. The
    // surface is mid-mount, not gone.
    if (sub == null) return;

    // Forward moves apply at once. A backward one is nearly always the gap
    // between one surface closing and the next opening — clicking a menu item
    // shuts the dropdown a beat before the next surface mounts, and reconciling
    // that instant would bounce the cutout back to the trigger. Hold it briefly
    // instead: if the next surface shows up, that forward move lands
    // immediately and cancels this; if nothing does, the grace elapses and we
    // accept the backward move.
    if (!force && this.ORDER[sub] < this.ORDER[this._sub]) {
      this._scheduleBackward();
      return;
    }
    this._clearBackward();
    this._setSub(sub);
    this._position();
  }

  _scheduleBackward() {
    if (this._backwardTimer) return;
    this._backwardTimer = setTimeout(() => {
      this._backwardTimer = null;
      this._reconcile(true);
    }, BACKWARD_GRACE_MS);
  }

  _clearBackward() {
    if (this._backwardTimer) {
      clearTimeout(this._backwardTimer);
      this._backwardTimer = null;
    }
  }

  /** Switch the active sub-step, running the sibling-greying side effects. */
  _setSub(sub) {
    if (sub === this._sub) return;
    // Leaving the greying sub-step for anywhere else must restore the siblings.
    if (this.DISABLE_SUB && this._sub === this.DISABLE_SUB) this._enableOthers();
    this._sub = sub;
    if (this.DISABLE_SUB && sub === this.DISABLE_SUB) this._disableOthers();
  }

  /**
   * Hold the guide on `sub` until that sub-step's surface actually appears.
   * Back's transitions animate (a dropdown only becomes visible when its open
   * animation completes), so without this the reconcile fired in the gap would
   * report the earlier sub-step. Self-releases after PIN_TIMEOUT_MS so a
   * surface that never shows can't wedge the guide.
   */
  _pin(sub) {
    this._pinned = sub;
    if (this._pinTimer) clearTimeout(this._pinTimer);
    this._pinTimer = setTimeout(() => {
      this._unpin();
      this._reconcile();
    }, PIN_TIMEOUT_MS);
  }

  /** Public form of _pin, for when the ORCHESTRATOR is the one putting a
   *  surface back on screen and needs the guide held there until it lands —
   *  the same job back()'s internal pins do for its own transitions. Must be
   *  set before start(), which reconciles as it comes up. */
  pinAt(sub) { this._pin(sub); }

  _unpin() {
    this._pinned = null;
    if (this._pinTimer) {
      clearTimeout(this._pinTimer);
      this._pinTimer = null;
    }
  }

  /** Measure the current sub-step's target and paint the spotlight + coach.
   *  Deduped: the body-wide observer fires on unrelated desk activity (chat,
   *  badges), so only actually repaint when the target's position/size, the
   *  sub-step, or the coach text changed — otherwise the coach flickers on
   *  every mutation. */
  _position() {
    if (!hasDom() || !this._sub) return;
    const el = this._targetEl();
    if (!visible(el)) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const coach = this._coachFor(this._sub);
    const hole = coach.hole !== false;
    // Without a hole nothing about the paint depends on the target's box, so
    // keep the rect OUT of the signature — otherwise the window settling into
    // place would repaint (and flicker) the coach for no visible gain. The
    // target is still measured above: it is what tells us the surface has
    // actually mounted.
    const sig = (hole
      ? [
        this._sub,
        Math.round(rect.left), Math.round(rect.top),
        Math.round(rect.width), Math.round(rect.height),
      ]
      : [this._sub, "nohole"])
      // The coach text can change without the target moving — Step 1's perm
      // phase swaps wording when a confirmation lands on top — so it is part of
      // the signature either way. So can its Next: Step 3's last beat keeps that
      // button disabled until the batch finishes uploading, and nothing else
      // about the paint changes when it finally enables, so without this the
      // dedup would leave it disabled for good.
      .concat(coach.text, coach.nextDisabled ? "off" : "on")
      .join(":");
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    // Mirror the target's own rounding so the cutout hugs it instead of
    // overshooting rounded corners with square ones.
    const radius =
      (typeof getComputedStyle === "function" &&
        getComputedStyle(el).borderRadius) || "";
    this._ui.spotlight(rect, {
      text: coach.text,
      showBack: coach.showBack,
      showNext: coach.showNext,
      nextDisabled: coach.nextDisabled,
      above: coach.above,
      hole,
      radius,
    });
  }

  // ───────── foreign-DOM sibling greying ─────────

  _disableOthers() {
    if (!hasDom() || !this.SEL?.otherItems) return;
    document.querySelectorAll(this.SEL.otherItems).forEach((el) => {
      el.classList.add(DISABLED_CLASS);
    });
  }

  _enableOthers() {
    if (!hasDom()) return;
    document.querySelectorAll("." + DISABLED_CLASS).forEach((el) => {
      el.classList.remove(DISABLED_CLASS);
    });
  }

  _clearSpot() {
    if (typeof this._ui?.clearSpotlight === "function") {
      this._ui.clearSpotlight();
    }
  }
}

module.exports = {
  GuideCore,
  hasDom,
  visible,
  firstVisible,
  DISABLED_CLASS,
  PIN_TIMEOUT_MS,
  BACKWARD_GRACE_MS,
};
