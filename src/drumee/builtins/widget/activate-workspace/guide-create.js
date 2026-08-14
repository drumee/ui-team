/**
 * Activation Step 1 guide — create a workspace.
 *
 * Walks the user through the REAL desk chrome rather than opening the form
 * programmatically:
 *
 *   1 add   → spotlight the topbar "New" button           → user clicks it
 *   2 menu  → spotlight the "Workspace" dropdown item,    → user clicks it
 *             grey-out the sibling items
 *   3 form  → spotlight the create-workspace modal        → user submits it
 *             (media_form)
 *   4 perm  → after create, spotlight the follow-up panel that opens for
 *             internal (permission-restricted) and external
 *             (window-secure-share) workspaces → user closes it → done
 *
 * THE THREE WORKSPACE TYPES END DIFFERENTLY, and the difference is which
 * surface the create opens next:
 *
 *   personal  a folder at the home root, not a hub. Nothing opens after it, so
 *             there is no perm phase at all → Step 2's card.
 *   internal  opens the permission panel, which is where members are invited —
 *             so that panel IS Step 2. The guide hands the flow over the moment
 *             it appears (_checkInvitePanel) and stops; the orchestrator shows
 *             the Step 2 card beside it and watches it from there.
 *   external  the same members panel, and therefore the same handoff. Left to
 *             itself the create form would launch the secure-share dock here —
 *             link management, not membership, so there would be no invite
 *             surface for Step 2 and the user would fall through to the plain
 *             card and its popup, the route a free-solo account cannot use. The
 *             desk overrides the form's follow-up while this flow is on screen
 *             (`post_override`, see Desk._createFormOverrides), so an external
 *             workspace reaches Step 2 exactly like a team one.
 *
 * The dock is still handled below, as the FALLBACK it now is: a workspace
 * created through a path that bypasses the desk's own new-workspace service —
 * the sidebar workspace-list launches its own dialog — gets no override, and the
 * guide has to cope with whatever appeared rather than spotlighting nothing.
 *
 * Back steps backwards through these; see back().
 *
 * The reconcile engine — observer, debounce, backward grace, pin, spotlight
 * dedup, sibling greying — lives in libs/guided-flow/guide-core. This class
 * supplies only the selector table, the sub-step decision, and the perm phase.
 */
const {
  GuideCore, hasDom, visible, firstVisible,
} = require("../../../libs/guided-flow/guide-core");

// Live-desk selectors. Kept here as the single source of truth for what the
// guide reaches into — if the topbar/form markup moves, this is the one place
// to update.
const SEL = {
  addBtn: ".desk-module-topbar__new-workspace-btn",
  createItem: ".desk-module-topbar__new-menu-create-group",
  wsItem: ".desk-module-topbar__add-menu-item.ico-workspace",
  otherItems: ".desk-module-topbar__add-menu-item:not(.ico-workspace)",
  form: ".form-folder__main",
  // The visible card is the widget ROOT (__ui) — it carries the background,
  // border-radius and shadow; __main is an inner box with no rounding.
  // Spotlight the card so the cutout wraps exactly what the user sees.
  formCard: ".form-folder__ui",
  // Follow-up permission panels: internal (team) → permission_restricted fed
  // into the wrapper-modal; external (share) → window_secure_share window.
  permPanels: ".permission-restricted__main, .window-secure-share__main",
  // External (share) branch only — used to pick the perm-phase coach text.
  permShare: ".window-secure-share__main",
  // Internal (team) branch only. This panel is where members are invited, so
  // the flow counts it as Step 2 — see the handoff in _checkInvitePanel.
  permInternal: ".permission-restricted__main",
  // The confirmation shown after an action inside those panels — e.g. sending
  // an invitation in permission_restricted pops Wm.alert → window_info, which
  // REPLACES the panel in the wrapper-modal. Spotlight the card ROOT (__ui) —
  // it carries the notice card's real width, background, rounding and shadow.
  windowInfo: ".window-info__ui",
};

// Safety net for the perm phase: a panel always opens, but if one never appears
// (unexpected), don't wedge the guide — complete after this.
//
// Two budgets, because the two ways a surface can arrive are nothing alike. A
// panel FED into the shared wrapper-modal lands in the same tick as the
// broadcast that starts this phase (media_form → parent.feed), so it is there
// almost immediately — which, with the override in place, is now every workspace
// type this flow creates. The secure-share dock is a WINDOW opened with
// Wm.launch on a LAZILY IMPORTED kind (seeds.js window_secure_share → dynamic
// import): its chunk has to be fetched and mounted before anything matches. On
// the short budget the phase could complete first — Step 1 ended, the flow moved
// on, and the dock arrived to no spotlight and no coach at all.
//
// So the long budget is the FALLBACK budget, kept for the bypass paths described
// in the docblock. It is still selected by area, because area is the only thing
// this guide can see: it is not told whether the override was applied.
const PERM_TIMEOUT_MS = 2500;
const PERM_TIMEOUT_WINDOW_MS = 20000;
const ORDER = { add: 1, menu: 2, form: 3, perm: 4 };

function tooltipFor(sub) {
  switch (sub) {
    case "add":
      return LOCALE.ACTIVATE_WS_GUIDE_ADD || 'Click “New” to get started.';
    case "menu":
      return LOCALE.ACTIVATE_WS_GUIDE_MENU || 'Choose “Workspace” from the menu.';
    case "form":
      return LOCALE.ACTIVATE_WS_GUIDE_FORM
        || "Pick a workspace type, name it, and click Create.";
    // "perm" is not handled here — the perm phase goes through permText(),
    // which picks the internal/external wording, or shows no coach at all.
    default:
      return "";
  }
}

/** Perm-phase instruction, keyed on the SURFACE rather than the workspace type —
 *  which is the same thing now that an external workspace also gets the members
 *  panel, and the right thing regardless: the coach describes what is on screen.
 *  The secure-share wording is therefore only reached on the fallback paths where
 *  the dock still opens (see the docblock). Not consulted once a confirmation
 *  (window_info) sits on top — that card speaks for itself, so _coachFor
 *  spotlights it with no coach at all. */
function permText() {
  if (firstVisible(SEL.permShare)) {
    return LOCALE.ACTIVATE_WS_GUIDE_PERM_EXTERNAL
      || "Open to share externally with your clients. Close to continue";
  }
  return LOCALE.ACTIVATE_WS_GUIDE_PERM_INTERNAL
    || "Add team members or Close to continue";
}

class ActivateCreateGuide extends GuideCore {
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
    this._invitePanel = false;  // the INTERNAL panel was seen → it is now Step 2
    this._completed = false;    // guard: onCreateGuideComplete fired once
    this._expandingCreate = false;
    this._clearPermTimer();
  }

  /** Cancel the "no panel ever appeared" safety timer. Called from the reset and
   *  from the moment a panel IS seen, so it lives in one place. */
  _clearPermTimer() {
    if (!this._permTimer) return;
    clearTimeout(this._permTimer);
    this._permTimer = null;
  }

  /**
   * The workspace was created (team/share). Enter the perm phase: wait for the
   * follow-up panel to appear, spotlight it, and complete once the user closes
   * it. Called by the orchestrator from workspace:refresh.
   *
   * @param {String} [area] the new workspace's area as the server echoed it
   *   back — "private" for internal/team, "share" for external. It picks the
   *   safety budget (see the two constants). ONLY "private" takes the short
   *   one: an area we do not recognise waits the long budget, since the cost of
   *   waiting too long is a late advance, while the cost of waiting too little
   *   is the sub-step never being shown at all.
   */
  onWorkspaceCreated(area) {
    this._created = true;
    this._permSeen = false;
    if (!hasDom()) return;  // Node/tests: the caller drives completion directly.
    const ms = String(area || "") === "private"
      ? PERM_TIMEOUT_MS
      : PERM_TIMEOUT_WINDOW_MS;
    this._permTimer = setTimeout(() => this._complete(), ms);
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
   * closing the confirmation is what advances.
   */
  /**
   * Two phases, and they share nothing: before the workspace exists this walks
   * the desk chrome, after it exists it waits on the follow-up panel. Split so
   * each reads on its own — they were one function only because they are reached
   * through the same reconcile.
   */
  _resolveSub() {
    if (this._created) return this._resolvePermSub();
    return this._resolveChromeSub();
  }

  /** The perm phase: wait on the follow-up panel, and on the confirmation that
   *  can replace it. */
  _resolvePermSub() {
    const info = firstVisible(SEL.windowInfo);
    const perm = firstVisible(SEL.permPanels);
    if (info || perm) {
      if (info) this._infoSeen = true;
      else this._permSeen = true;
      // A panel is up — cancel the "no panel appeared" safety timer so it can't
      // auto-advance while the user is still reviewing/closing it.
      this._clearPermTimer();
      this._checkInvitePanel();
      return "perm";
    }
    // Nothing visible now. Panels open a tick after their trigger, so only treat
    // "gone" as done once we have actually seen one close:
    //   - window_info was shown and dismissed  → done (panel may linger), or
    //   - the permission panel was shown and closed with no confirmation.
    if (this._infoSeen || this._permSeen) this._complete();
    return null;
  }

  /** Walking the desk chrome to reach the create form. Innermost surface wins:
   *  the form covers the dropdown, which covers New. */
  _resolveChromeSub() {
    if (visible(document.querySelector(SEL.form))) return "form";
    if (visible(document.querySelector(SEL.wsItem))) {
      this._expandingCreate = false;
      return "menu";
    }

    // The merged New control adds one visual grouping level before Workspace.
    // Expand that create group as soon as the user opens New so the Workspace
    // target becomes visible without adding another coach step.
    const createItem = firstVisible(SEL.createItem);
    // NOT an optional chain, and it must not be turned into one. `createItem?.
    // dataset.submenu !== "open"` reads as the same thing and is not: with no
    // create item on screen it yields `undefined !== "open"` — TRUE — and the
    // guide would ask the desk to expand a menu that is not there. The `&&` here
    // guards a real comparison, not a dereference.
    if (createItem && createItem.dataset.submenu !== "open") {
      if (!this._expandingCreate) {
        this._expandingCreate = true;
        this._ui.setNewCreateMenu(true);
      }
      return null;
    }
    this._expandingCreate = false;
    return "add";
  }

  /**
   * Hand the flow over to Step 2 the first time the INTERNAL (team) panel is on
   * screen: inviting members is what Step 2 asks for, so that panel is Step 2's
   * surface, not a tail of Step 1 (see index.js onInvitePanel). The orchestrator
   * stops this guide as it takes over, which is why nothing here has to unwind:
   * stop() resets every flag.
   *
   * Latched all the same — a reconcile can land between the handover and the
   * teardown, and the invitation's confirmation REPLACES the panel in the
   * wrapper-modal, so a second call must not fire.
   *
   * The external branch never matches this selector and so never fires: it runs
   * the perm phase to completion and lands on the Step 2 card instead.
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
      // A confirmation carries its own message and Close button, so spotlight
      // it bare: an empty text tells the orchestrator to paint the cutout
      // without a coach, which would otherwise sit under the notice repeating
      // it as a second, stray drumee card.
      const bare = !!firstVisible(SEL.windowInfo);
      // No Back in the perm phase: the workspace already exists, so retreating
      // to the Step 1 card would be a lie. The user closes the panel to
      // continue.
      return { text: bare ? "" : permText(), showBack: false, showNext: false };
    }
    // No Next anywhere in Step 1: every sub-step is released by the user doing
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
   * @returns {boolean} true when it handled a step-back, false when the guide
   *   should exit.
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
        // (form gone, dropdown not yet visible) would drop the guide to "add".
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

  /** Perm phase done (panel closed, or safety timeout) → Step 2. */
  _complete() {
    if (this._completed) return;
    this._completed = true;
    if (typeof this._ui?.onCreateGuideComplete === "function") {
      this._ui.onCreateGuideComplete();
    }
  }
}

module.exports = { ActivateCreateGuide, SEL, ORDER };
