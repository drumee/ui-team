/**
 * Reward-flow Step 1 guide controller.
 *
 * Walks the user through the REAL desk chrome to create a workspace, rather
 * than opening the form programmatically:
 *
 *   add   → spotlight the topbar "Add new" button        → user clicks it
 *   menu  → spotlight the "Workspace" dropdown item,      → user clicks it
 *           grey-out + disable the sibling items
 *   form  → spotlight the workspace form (form-folder)    → user submits it
 *   perm  → after create: spotlight the follow-up permission panel that opens
 *           for internal (permission-restricted) / external (window-secure-
 *           share) workspaces  → user closes it → done
 *
 * Advancement is driven by observing the live DOM, not by intercepting clicks:
 * a single MutationObserver calls _reconcile(), which reads what is actually
 * on screen and re-points the spotlight at the correct sub-step. That makes
 * every off-path case self-healing — close the dropdown and it re-guides to
 * the Add button; cancel the form and it re-guides from the top — without any
 * per-event handlers.
 *
 * The orchestrator tells the guide when the workspace was created (via
 * RADIO_BROADCAST "workspace:refresh" → onWorkspaceCreated). From there the
 * guide waits for the permission panel to appear and then be closed, and calls
 * back ui.onGuideComplete() to advance to Step 2. (A Personal workspace opens
 * no panel; the orchestrator completes that case directly and never enters the
 * perm phase.)
 *
 * All DOM work is guarded on `typeof document` so the module stays requirable
 * (and the orchestrator stays unit-testable) under Node.
 */

// Live-desk selectors. Kept here as the single source of truth for what the
// guide reaches into — if the topbar/form markup moves, this is the one place
// to update.
const SEL = {
  addBtn: ".desk-module-topbar__new-workspace-btn",
  wsItem: ".desk-module-topbar__add-menu-item.ico-workspace",
  otherItems: ".desk-module-topbar__add-menu-item:not(.ico-workspace)",
  form: ".form-folder__main",
  // Follow-up permission panels: internal (team) → permission_restricted fed
  // into the wrapper-modal; external (share) → window_secure_share window.
  permPanels: ".permission-restricted__main, .window-secure-share__main",
};

const DISABLED_CLASS = "reward-guide-disabled";
const RECONCILE_DEBOUNCE_MS = 30;
// Safety net for the perm phase: team/share always open a panel, but if one
// never appears (unexpected), don't wedge the guide — complete after this.
const PERM_TIMEOUT_MS = 2500;

function hasDom() {
  return typeof document !== "undefined" && !!document.querySelector;
}

/**
 * Truly on screen right now. offsetParent is NOT enough: the topbar dropdown
 * renders its items at mount and merely toggles `visibility:hidden` when closed
 * (see topbar.scss `.menu-topic-items__wrapper`), which offsetParent can't see —
 * and it is also null for the position:fixed modal that hosts the form, which
 * we DO want to treat as visible. So:
 *   - getClientRects().length === 0  → display:none or detached  (not visible)
 *   - computed visibility === hidden → the closed dropdown         (not visible)
 * Everything else, including position:fixed, is visible.
 */
function visible(el) {
  if (!el || typeof el.getClientRects !== "function") return false;
  if (el.getClientRects().length === 0) return false;
  if (typeof getComputedStyle === "function") {
    const s = getComputedStyle(el);
    if (s && (s.visibility === "hidden" || s.display === "none")) return false;
  }
  return true;
}

function tooltipFor(sub) {
  switch (sub) {
    case "add":
      return LOCALE.REWARD_FLOW_GUIDE_ADD || 'Click “Add new” to get started.';
    case "menu":
      return LOCALE.REWARD_FLOW_GUIDE_MENU || 'Choose “Workspace” from the menu.';
    case "form":
      return LOCALE.REWARD_FLOW_GUIDE_FORM
        || "Pick a workspace type, name it, and click Create.";
    case "perm":
      return LOCALE.REWARD_FLOW_GUIDE_PERM
        || "Review who can access it, then close to continue.";
    default:
      return "";
  }
}

/** First matching element that is actually on screen, else null. */
function firstVisible(selector) {
  if (!hasDom()) return null;
  const els = document.querySelectorAll(selector);
  for (let i = 0; i < els.length; i++) {
    if (visible(els[i])) return els[i];
  }
  return null;
}

class RewardGuide {
  constructor(ui) {
    this._ui = ui;              // the reward_flow orchestrator
    this._sub = null;           // "add" | "menu" | "form" | "perm" | null
    this._observer = null;
    this._reconcileTimer = null;
    this._onResize = null;
    this._lastSig = null;       // last painted spotlight signature (dedup)
    this._created = false;      // workspace created → perm phase active
    this._permSeen = false;     // the permission panel has appeared at least once
    this._completed = false;    // guard: onGuideComplete fired once
    this._permTimer = null;
    this._reconcile = this._reconcile.bind(this);
    this._scheduleReconcile = this._scheduleReconcile.bind(this);
  }

  /**
   * The workspace was created (team/share). Enter the perm phase: wait for the
   * follow-up permission panel to appear, spotlight it, and complete once the
   * user closes it. Called by the orchestrator from workspace:refresh.
   */
  onWorkspaceCreated() {
    this._created = true;
    this._permSeen = false;
    if (!hasDom()) return;  // Node/tests: the caller drives completion directly.
    this._permTimer = setTimeout(() => this._complete(), PERM_TIMEOUT_MS);
    this._reconcile();
  }

  /** Begin guiding. No-op (safe) when there is no DOM. */
  start() {
    if (!hasDom()) return;
    if (this._observer) return; // already running
    this._observer = new MutationObserver(this._scheduleReconcile);
    this._observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "class", "style"],
    });
    this._onResize = () => this._position();
    window.addEventListener("resize", this._onResize, { passive: true });
    this._sub = null;
    // Fresh run (the guide instance is reused across Back → Continue): clear the
    // perm-phase flags so a prior completion can't short-circuit this one.
    this._created = false;
    this._permSeen = false;
    this._completed = false;
    this._reconcile();
  }

  /** Tear everything down: observer, listeners, disabled siblings, spotlight. */
  stop() {
    if (this._observer) {
      this._observer.disconnect();
      this._observer = null;
    }
    if (this._reconcileTimer) {
      clearTimeout(this._reconcileTimer);
      this._reconcileTimer = null;
    }
    if (this._permTimer) {
      clearTimeout(this._permTimer);
      this._permTimer = null;
    }
    if (this._onResize && typeof window !== "undefined") {
      window.removeEventListener("resize", this._onResize);
      this._onResize = null;
    }
    this._enableOthers();
    this._sub = null;
    this._lastSig = null;
    this._created = false;
    this._permSeen = false;
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

  /** Read the live DOM and make the spotlight match reality. Idempotent. */
  _reconcile() {
    if (!hasDom() || !this._observer) return;

    // Post-creation: spotlight the permission panel, complete once it closes.
    if (this._created) {
      const perm = firstVisible(SEL.permPanels);
      if (perm) {
        this._permSeen = true;
        // The panel is up — cancel the "no panel appeared" safety timer so it
        // can't auto-advance while the user is still reviewing/closing it.
        if (this._permTimer) {
          clearTimeout(this._permTimer);
          this._permTimer = null;
        }
        this._setSub("perm");
        this._position();
        return;
      }
      // The panel opens a tick after workspace:refresh; only treat "gone" as
      // done once we have actually seen it, otherwise keep waiting.
      if (this._permSeen) this._complete();
      return;
    }

    let sub;
    if (visible(document.querySelector(SEL.form))) sub = "form";
    else if (visible(document.querySelector(SEL.wsItem))) sub = "menu";
    else sub = "add";
    this._setSub(sub);
    this._position();
  }

  /** Switch the active sub-step, running the menu-disable side effects. */
  _setSub(sub) {
    if (sub === this._sub) return;
    // Leaving "menu" for anywhere else must restore the siblings we dimmed.
    if (this._sub === "menu") this._enableOthers();
    this._sub = sub;
    if (sub === "menu") this._disableOthers();
  }

  _targetEl() {
    switch (this._sub) {
      case "perm": return firstVisible(SEL.permPanels);
      case "form": return document.querySelector(SEL.form);
      case "menu": return document.querySelector(SEL.wsItem);
      case "add": return document.querySelector(SEL.addBtn);
      default: return null;
    }
  }

  /** Perm phase done (panel closed, or safety timeout) → advance to Step 2. */
  _complete() {
    if (this._completed) return;
    this._completed = true;
    if (this._ui && typeof this._ui.onGuideComplete === "function") {
      this._ui.onGuideComplete();
    }
  }

  /** Measure the current sub-step's target and paint the spotlight + tooltip.
   *  Deduped: the body-wide observer fires on unrelated desk activity (chat,
   *  badges), so only actually repaint when the target's position/size or the
   *  sub-step changed — otherwise the coach tooltip flickers on every mutation. */
  _position() {
    if (!hasDom() || !this._sub) return;
    const el = this._targetEl();
    if (!visible(el)) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const sig = [
      this._sub,
      Math.round(rect.left), Math.round(rect.top),
      Math.round(rect.width), Math.round(rect.height),
    ].join(":");
    if (sig === this._lastSig) return;
    this._lastSig = sig;
    // No Back in the perm phase: the workspace already exists, so retreating to
    // the Step 1 card would be a lie. The user closes the panel to continue.
    this._ui.spotlight(rect, tooltipFor(this._sub), this._sub !== "perm");
  }

  // ───────── foreign-DOM sibling disabling ─────────

  _disableOthers() {
    if (!hasDom()) return;
    document.querySelectorAll(SEL.otherItems).forEach((el) => {
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
    if (this._ui && typeof this._ui.clearSpotlight === "function") {
      this._ui.clearSpotlight();
    }
  }
}

module.exports = RewardGuide;
