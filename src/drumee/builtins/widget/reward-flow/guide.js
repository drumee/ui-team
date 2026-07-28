/**
 * Reward-flow Step 1 guide controller.
 *
 * Walks the user through the REAL desk chrome to create a workspace, rather
 * than opening the form programmatically:
 *
 *   1 add   → spotlight the topbar "Add new" button       → user clicks it
 *   2 menu  → spotlight the "Workspace" dropdown item,    → user clicks it
 *             grey-out + disable the sibling items
 *   3 form  → spotlight the create-workspace modal         → user submits it
 *             (form-folder)
 *   4 perm  → optional: after create, spotlight the follow-up permission panel
 *             that opens for internal (permission-restricted) / external
 *             (window-secure-share) workspaces → user closes it → done
 *
 * The internal branch of that last sub-step is Step 2, not Step 1: it is the
 * panel that invites members. The guide hands the flow over to it as soon as
 * the panel is on screen (_checkInvitePanel) and keeps guiding; closing it
 * completes Step 2 rather than Step 1. Nothing else about the walkthrough
 * changes, and the external branch is untouched.
 *
 * Back steps backwards through these; see back().
 *
 * The reconcile engine — observer, debounce, backward grace, pin, spotlight
 * dedup, sibling greying — lives in guide-core.js. This class supplies only the
 * selector table, the sub-step decision, and Step 1's perm phase.
 *
 * The orchestrator tells the guide when the workspace was created (via
 * RADIO_BROADCAST "workspace:refresh" → onWorkspaceCreated). From there the
 * guide waits for the permission panel to appear and then be closed, and calls
 * back ui.onGuideComplete(), which advances to whatever follows the step the
 * walkthrough is running as. (A Personal workspace opens no panel; the
 * orchestrator completes that case directly and never enters the perm phase.)
 */
const { GuideCore, hasDom, visible, firstVisible } = require("./guide-core");

// Live-desk selectors. Kept here as the single source of truth for what the
// guide reaches into — if the topbar/form markup moves, this is the one place
// to update.
const SEL = {
  addBtn: ".desk-module-topbar__new-workspace-btn",
  wsItem: ".desk-module-topbar__add-menu-item.ico-workspace",
  otherItems: ".desk-module-topbar__add-menu-item:not(.ico-workspace)",
  form: ".form-folder__main",
  // The visible card is the widget ROOT (__ui) — it carries the background,
  // border-radius and shadow; __main is an inner box with no rounding. Spotlight
  // the card so the cutout wraps exactly what the user sees.
  formCard: ".form-folder__ui",
  // Follow-up permission panels: internal (team) → permission_restricted fed
  // into the wrapper-modal; external (share) → window_secure_share window.
  permPanels: ".permission-restricted__main, .window-secure-share__main",
  // External (share) branch only — used to pick the perm-phase coach text.
  permShare: ".window-secure-share__main",
  // Internal (team) branch only. This panel is where members are invited, so
  // the flow counts it as Step 2 — see the handoff in _resolveSub.
  permInternal: ".permission-restricted__main",
  // The confirmation shown after an action inside those panels — e.g. sending
  // an invitation in permission_restricted pops Wm.alert → window_info, which
  // REPLACES the panel in the wrapper-modal. Spotlight the card ROOT (__ui) —
  // it carries the notice card's real width, background, rounding and shadow;
  // __main is an inner box, so cutting it out leaves the visible card edges
  // outside the hole. (Same rationale as formCard above.)
  windowInfo: ".window-info__ui",
};

// Safety net for the perm phase: team/share always open a panel, but if one
// never appears (unexpected), don't wedge the guide — complete after this.
const PERM_TIMEOUT_MS = 2500;
const ORDER = { add: 1, menu: 2, form: 3, perm: 4 };

function tooltipFor(sub) {
  switch (sub) {
    case "add":
      return LOCALE.REWARD_FLOW_GUIDE_ADD || 'Click “Add new” to get started.';
    case "menu":
      return LOCALE.REWARD_FLOW_GUIDE_MENU || 'Choose “Workspace” from the menu.';
    case "form":
      return LOCALE.REWARD_FLOW_GUIDE_FORM
        || "Pick a workspace type, name it, and click Create.";
    // "perm" is not handled here — the perm phase goes through permText(), which
    // picks the internal/external wording, or shows no coach at all.
    default:
      return "";
  }
}

/** Perm-phase instruction — one uniform line (no separate heading), specific to
 *  the branch: internal (permission_restricted) vs external (secure_share).
 *  Not consulted once a confirmation (window_info) sits on top — that card
 *  speaks for itself, so _coachFor spotlights it with no coach at all. */
function permText() {
  if (firstVisible(SEL.permShare)) {
    return LOCALE.REWARD_FLOW_GUIDE_PERM_EXTERNAL
      || "Open to share externally with your clients. Close to continue";
  }
  return LOCALE.REWARD_FLOW_GUIDE_PERM_INTERNAL
    || "Add team members or Close to continue";
}

class RewardGuide extends GuideCore {
  constructor(ui) {
    super(ui);
    this.SEL = SEL;
    this.ORDER = ORDER;
    this.DISABLE_SUB = "menu";
    this._resetState();
  }

  _resetState() {
    this._created = false;      // workspace created → perm phase active
    this._permSeen = false;     // the permission panel has appeared at least once
    this._infoSeen = false;     // the window_info confirmation has appeared
    this._invitePanel = false;  // the INTERNAL panel was seen → running as Step 2
    this._completed = false;    // guard: onGuideComplete fired once
    if (this._permTimer) {
      clearTimeout(this._permTimer);
      this._permTimer = null;
    }
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

  /**
   * Post-creation: spotlight the follow-up panel(s), complete when the user has
   * closed the relevant one. Two panel kinds can appear:
   *   - the permission panel (permission_restricted / secure_share)
   *   - a window_info confirmation popped ON TOP after an action inside it
   *     (e.g. sending an invitation), which stays until closed.
   * The window_info takes priority: once it has been shown and then closed, the
   * step is done — the permission panel may still be open behind it, and
   * closing the confirmation is what advances to Step 2.
   */
  _resolveSub() {
    if (this._created) {
      const info = firstVisible(SEL.windowInfo);
      const perm = firstVisible(SEL.permPanels);
      if (info || perm) {
        if (info) this._infoSeen = true;
        else this._permSeen = true;
        // A panel is up — cancel the "no panel appeared" safety timer so it
        // can't auto-advance while the user is still reviewing/closing it.
        if (this._permTimer) {
          clearTimeout(this._permTimer);
          this._permTimer = null;
        }
        this._checkInvitePanel();
        return "perm";
      }
      // Nothing visible now. Panels open a tick after their trigger, so only
      // treat "gone" as done once we have actually seen one close:
      //   - window_info was shown and dismissed  → done (panel may linger), or
      //   - the permission panel was shown and closed with no confirmation.
      if (this._infoSeen || this._permSeen) this._complete();
      return null;
    }

    // Innermost surface wins: the form covers the dropdown, which covers the
    // Add-new button.
    if (visible(document.querySelector(SEL.form))) return "form";
    if (visible(document.querySelector(SEL.wsItem))) return "menu";
    return "add";
  }

  /**
   * Hand the perm phase over to Step 2 the first time the INTERNAL (team) panel
   * is on screen: inviting members is what Step 2 asks for, so the flow counts
   * this panel as Step 2 rather than as a tail of Step 1 (see index.js
   * onInvitePanel). The walkthrough is unaffected — it keeps running, only the
   * step name changes.
   *
   * Latched, because the confirmation raised by sending an invitation REPLACES
   * the panel in the wrapper-modal: from then on only window_info is visible,
   * and this must not read that as "no longer the internal branch".
   *
   * The external branch never matches this selector and so never fires: it ends
   * Step 1 the way it always did.
   */
  _checkInvitePanel() {
    if (this._invitePanel) return;
    if (!firstVisible(SEL.permInternal)) return;
    this._invitePanel = true;
    if (typeof this._ui?.onInvitePanel === "function") this._ui.onInvitePanel();
  }

  _pinReady() {
    const formVisible = visible(document.querySelector(SEL.form));
    const menuVisible = visible(document.querySelector(SEL.wsItem));
    return (
      (this._pinned === "menu" && menuVisible) ||
      (this._pinned === "form" && formVisible) ||
      (this._pinned === "add" && !formVisible && !menuVisible)
    );
  }

  _targetEl() {
    switch (this._sub) {
      // The window_info confirmation sits on top of the permission panel, so
      // spotlight it when present, else the panel itself.
      case "perm": return firstVisible(SEL.windowInfo) || firstVisible(SEL.permPanels);
      // Prefer the card root so the cutout wraps the whole visible form.
      case "form":
        return firstVisible(SEL.formCard) || document.querySelector(SEL.form);
      case "menu": return document.querySelector(SEL.wsItem);
      case "add": return document.querySelector(SEL.addBtn);
      default: return null;
    }
  }

  _coachFor(sub) {
    if (sub === "perm") {
      // The invite-sent confirmation carries its own message and Close button,
      // so spotlight it bare: an empty text tells the orchestrator to paint the
      // cutout without a coach, which would otherwise sit under the notice
      // repeating it as a second, stray drumee card.
      const bare = !!firstVisible(SEL.windowInfo);
      // No Back in the perm phase: the workspace already exists, so retreating
      // to the Step 1 card would be a lie. The user closes the panel to
      // continue.
      return { text: bare ? "" : permText(), showBack: false, showNext: false };
    }
    // Step 1 has no Next anywhere: every sub-step is released by the user doing
    // the real action.
    return { text: tooltipFor(sub), showBack: true, showNext: false };
  }

  /**
   * Back within the walkthrough — step back one sub-step rather than exiting:
   *
   *   4 perm → nothing (the workspace exists; Back is hidden there anyway)
   *   3 form → close the create modal + re-open the dropdown  → 2 menu
   *   2 menu → close the dropdown                              → 1 add
   *   1 add  → nothing earlier; the orchestrator exits the guide
   *
   * Each transition drives the real widgets THROUGH the orchestrator (Wm's
   * wrapper-modal part, the desk's addmenu part) and lets the observer
   * reconcile to the resulting sub-step, so this needs no state of its own.
   * Synthetic clicks can't be used here: the framework debounces every widget
   * click globally for 300ms, so a click issued from inside the user's own Back
   * click is swallowed.
   *
   * Returns true when it handled a step-back, false when the guide should exit.
   */
  back() {
    if (!hasDom()) return false;
    switch (this._sub) {
      case "perm":
        // The workspace already exists — swallow Back rather than reverting to
        // a card that would misrepresent state.
        return true;

      case "form": {
        // Close the modal and re-open the dropdown. The dropdown only becomes
        // visible when its open ANIMATION completes, so pin the sub-step to
        // "menu" until it actually appears — otherwise the reconcile in the gap
        // (form gone, dropdown not yet visible) would drop the guide to "add",
        // which is exactly the 3 → 1 bug.
        this._pin("menu");
        this._ui.closeCreateForm();
        this._ui.setAddMenu(true);
        return true;
      }

      case "menu":
        // Close the dropdown → reconcile falls back to "add".
        this._ui.setAddMenu(false);
        return true;

      default:
        return false;
    }
  }

  /** Perm phase done (panel closed, or safety timeout) → the orchestrator
   *  advances: Step 3 when this ran as Step 2 (internal panel), else Step 2. */
  _complete() {
    if (this._completed) return;
    this._completed = true;
    if (typeof this._ui?.onGuideComplete === "function") {
      this._ui.onGuideComplete();
    }
  }
}

module.exports = RewardGuide;
