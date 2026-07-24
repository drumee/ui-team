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
 *
 * Advancement is driven by observing the live DOM, not by intercepting clicks:
 * a single MutationObserver calls _reconcile(), which reads what is actually
 * on screen and re-points the spotlight at the correct sub-step. That makes
 * every off-path case self-healing — close the dropdown and it re-guides to
 * the Add button; cancel the form and it re-guides from the top — without any
 * per-event handlers. Final completion (workspace created) is signalled to the
 * orchestrator out-of-band via RADIO_BROADCAST "workspace:refresh", so the
 * guide never has to detect success itself; the orchestrator calls stop().
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
};

const DISABLED_CLASS = "reward-guide-disabled";
const RECONCILE_DEBOUNCE_MS = 30;

function hasDom() {
  return typeof document !== "undefined" && !!document.querySelector;
}

/** Visible = in the DOM and not display:none/detached (offsetParent is null for
 *  both, and for position:fixed — which none of our targets use). */
function visible(el) {
  return !!el && el.offsetParent !== null;
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
    default:
      return "";
  }
}

class RewardGuide {
  constructor(ui) {
    this._ui = ui;              // the reward_flow orchestrator
    this._sub = null;           // "add" | "menu" | "form" | null
    this._observer = null;
    this._reconcileTimer = null;
    this._onResize = null;
    this._reconcile = this._reconcile.bind(this);
    this._scheduleReconcile = this._scheduleReconcile.bind(this);
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
    if (this._onResize && typeof window !== "undefined") {
      window.removeEventListener("resize", this._onResize);
      this._onResize = null;
    }
    this._enableOthers();
    this._sub = null;
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
    const form = document.querySelector(SEL.form);
    const wsItem = document.querySelector(SEL.wsItem);

    let sub;
    if (visible(form)) sub = "form";
    else if (visible(wsItem)) sub = "menu";
    else sub = "add";

    if (sub !== this._sub) {
      // Leaving "menu" for anywhere else must restore the siblings we dimmed.
      if (this._sub === "menu") this._enableOthers();
      this._sub = sub;
      if (sub === "menu") this._disableOthers();
    }
    this._position();
  }

  _targetEl() {
    switch (this._sub) {
      case "form": return document.querySelector(SEL.form);
      case "menu": return document.querySelector(SEL.wsItem);
      case "add": return document.querySelector(SEL.addBtn);
      default: return null;
    }
  }

  /** Measure the current sub-step's target and paint the spotlight + tooltip. */
  _position() {
    if (!hasDom() || !this._sub) return;
    const el = this._targetEl();
    if (!visible(el)) return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    this._ui.spotlight(rect, tooltipFor(this._sub));
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
