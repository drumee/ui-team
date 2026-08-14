/**
 * Workspace activation flow.
 *
 * A three-step walkthrough that takes a brand-new account from an empty desk to
 * a workspace with a teammate and a file in it. It runs once, straight after
 * the product tour (see modules/desk `_maybeStartActivateWorkspace`), and it is
 * the tour's practical half: the tour SHOWS the product on a mock desk, this
 * one has the user build the real thing.
 *
 *   step1         → "Create your workspace", informational
 *   step1_guide   → the walkthrough that creates it (see guide-create.js). It
 *                   spotlights the real desk chrome — New → Workspace → the
 *                   form — and ends when the workspace exists
 *   step2         → "Invite a teammate". Its Invite fires the desk's
 *                   "invite-member" service; its Skip goes straight to Step 3
 *   step2_waiting → a real surface is open and the card waits beside it. Two
 *                   ways in: the INTERNAL (team) permission panel the
 *                   walkthrough ends on, which IS Step 2 — it is where members
 *                   are invited — so Step 1 hands straight over to it
 *                   (onInvitePanel); or the invite popup opened from the card,
 *                   where onInvitationSent() latches the success. Either way
 *                   the surface going away decides what happens next — see
 *                   guide-invite.js
 *   step3         → "Upload your first file", which reopens the workspace
 *   step3_guide   → the walkthrough inside that workspace (see guide-upload.js):
 *                   + New → From device → the upload → the files panel it
 *                   landed in. The last Next ends the flow
 *   done          → modal, then the flow closes for good
 *
 * STEP 2 IS SKIPPABLE, and that is the one place this diverges from the shape
 * reward-flow set. Its Skip exists because inviting is the one step of the
 * three a user can be unable to perform: a brand-new account is on the free
 * solo plan, where the invite popup declines to open at all
 * (libs/billing isFreeSoloPlan), and a solo founder may simply have nobody to
 * invite yet. A step that can neither be completed nor left is worse than an
 * optional one, so Step 3 is the only second step this flow insists on.
 *
 * WHAT THIS IS NOT. It descends from the reward flow (builtins/widget/
 * reward-flow), which walks these same three surfaces for the "Claim your free
 * storage" campaign, and the two share their engine (libs/guided-flow). It does
 * NOT share the campaign: there is no eligibility gate, no email CTA to arrive
 * from, no capped slot to win, and nothing to report to a funnel. It is
 * onboarding, so the only thing it can cost a user who walks away is the
 * walkthrough itself.
 *
 * THE FLOW IS FORCE-COMPLETED. It offers no way out: a click on the dim does
 * nothing but acknowledge itself, the browser's Back is trapped and pushed
 * straight back, refresh keystrokes are cancelled, and a tab close raises the
 * browser's native warning (see exit-guard.js). The only exits are finishing it
 * and the states where it CANNOT be finished, which end it rather than strand
 * the user on an unusable desk — see _openWorkspace's caller and
 * onCreateGuideComplete.
 *
 * That ceiling is the browser's, not a choice: the reload button, the address
 * bar and a killed process are all out of reach, and `beforeunload` is ignored
 * outright until the user has interacted with the page. Nothing here survives a
 * crash, and nothing re-triggers the flow afterwards — guaranteeing it is
 * eventually finished needs persisted state and a re-trigger on the next load,
 * which is not built (see the design doc's Tier 2 note).
 *
 * And no resume. The flow is one session long: nothing about it is persisted —
 * not the step, not the workspace. See the design doc,
 * docs/superpowers/specs/2026-08-13-activate-workspace-design.md
 */
const { doneModal } = require("./skeleton/modal");
const { ExitGuard } = require("./exit-guard");
const {
  baseStep, isWaiting, isGuiding,
} = require("../../../libs/guided-flow/steps");
const { readDescriptor } = require("../../../libs/guided-flow/descriptor");
const { coachAnchor, coachCenter } = require("../../../libs/guided-flow/anchor");
const { unionRects } = require("../../../libs/guided-flow/geometry");
// The guides' own visibility test, reused for the popup's dropdowns: presence
// in the DOM is not enough for something that is `visibility: hidden` until
// opened.
const { visible: onScreen } = require("../../../libs/guided-flow/guide-core");

/** The three card steps, in order. Transient states (`*_waiting`, `*_guide`)
 *  are NOT listed: they are decorations on one of these. */
const STEPS = ["step1", "step2", "step3"];

/**
 * How long "Upload your first file" waits for the workspace window before
 * handing the user back their card to try again. Loading is a fetch plus a
 * mount; anything past this is a failure, not slowness.
 */
const OPEN_WORKSPACE_TIMEOUT_MS = 4000;

// How long the card's "I saw that" pulse is left armed. A little longer than the
// animation itself (see the skin), so the attribute never comes off mid-pulse.
const NUDGE_MS = 500;

// How long the cutout keeps following its target once it is on screen (see
// _trackStepTarget). Sized to outlast the slowest entrance a target has: the
// permission panel's half-second slide, plus the tick before it starts.
const TARGET_SETTLE_MS = 900;

// How long it will WAIT for a target that has not appeared yet. The surfaces
// Step 2 spotlights are lazily imported kinds — the invite popup goes through
// Kind.waitFor("invite_popup") before it is even fed — so the chunk fetch can
// outlast any settle window, and a fixed one leaves the hole collapsed and the
// popup sitting in the dim.
const TARGET_WAIT_MS = 8000;

// Step 2's surfaces and their selectors belong to the module that watches them
// (guide-invite.js), which is also where the two routes in are described. They
// are needed here for the cutout, which has to know what it is cutting a hole
// around. Required at the top rather than lazily: nothing in that module touches
// the DOM at load, so it costs nothing to have it resident.
const {
  InviteSurfaces,
  STEP2_SURFACES, PANEL_SURFACES, POPUP_SURFACES, POPUP_OVERFLOW,
} = require("./guide-invite");

// The live topbar control each step points at. The cutout is laid over it and
// the card anchored beneath it (see _applyStepTarget). Step 3's entry is the
// fallback for a run with no workspace to reopen — which this flow ends rather
// than reaches (see onCreateGuideComplete) — so in practice only Step 2 uses it.
const STEP_TARGET = {
  step2: ".desk-module-topbar__invite-btn",
  step3: ".desk-module-topbar__new-workspace-btn",
};

/**
 * Does this step hang its card off no topbar control, and therefore spotlight no
 * topbar control either?
 *
 * Two do. The panel Step 2, whose surface IS the spotlight, is a tall right-hand
 * rail with nothing to hang a card under. And Step 3 always guides the user
 * inside the workspace rather than at the desk topbar.
 *
 * Step 3 is tested on the step alone rather than on the descriptor, so this
 * agrees with the skeleton by construction: a Step 3 without a workspace is
 * unreachable (onCreateGuideComplete ends the flow instead), and if it ever were
 * reached, the two disagreeing would render a cutout with no card placement to
 * match it. Both are centred by the stylesheet — see skin __anchor.
 *
 * @param {String} base card step
 * @param {Boolean} onPanel Step 2 served by the permission panel
 * @returns {Boolean}
 */
function isCentredStep(base, onPanel) {
  return !!onPanel || base === "step3";
}

/**
 * WHERE THE HOLE GOES for a given step.
 *
 * On a waiting Step 2 it is the surface the user was handed to — the invite popup,
 * or the permission panel — and NOT the topbar control that opened it: that
 * control is behind a modal by then, so a hole over it lights up a corner of the
 * topbar for no reason while the surface the user is actually working sits in the
 * dim. Both are given as a surface PAIR, because a successful send replaces
 * either with its confirmation and querySelector then returns whichever is really
 * there — so the hole follows the surface instead of staying on a rect that has
 * gone.
 *
 * Cutting the surface out is also what makes the dim uniform: the shadow around
 * the hole is painted by the flow's root, which is portaled to document.body and
 * lifted clear of the wrapper-modal, so it covers the topbar and sidebar too —
 * neither of which the modal's own backdrop reaches, it being confined to the
 * desk's wm-container.
 *
 * Every other step spotlights its own topbar control, and a centred step
 * spotlights nothing at all.
 *
 * @param {{base: String, waiting: Boolean, onPanel: Boolean, notarget: Boolean}} s
 * @returns {String|null} a selector, or null when nothing is spotlighted
 */
function stepSpotSelector({ base, waiting, onPanel, notarget }) {
  if (base === "step2" && waiting) {
    return onPanel ? PANEL_SURFACES : POPUP_SURFACES;
  }
  if (notarget) return null;
  return STEP_TARGET[base] || null;
}

class __activate_workspace extends LetcBox {
  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();

    this._step = "step1";
    this._modalOpen = false;
    this._inviteSucceeded = false;
    // Step 2 is being served by the permission panel Step 1 ended on, not by
    // the invite popup — see onInvitePanel.
    this._invitePanelOpen = false;
    // …and its confirmation is standing in the panel's place, which hides the
    // card behind it (see markInviteToast).
    this._inviteToastOpen = false;
    // The workspace Step 1 created, which Step 3 reopens. Memory only: the flow
    // does not survive a reload by design, so persisting it would write a key
    // that nothing ever reads back.
    this._workspace = null;

    // The completion signal for Step 3. Fires per FILE, so the upload guide —
    // not this — decides what it means: it has two beats left to run.
    this._onUploaded = () => this.onUploadDone();
    if (typeof RADIO_MEDIA !== "undefined") {
      RADIO_MEDIA.on(_e.uploaded, this._onUploaded);
    }

    // media_form broadcasts "workspace:refresh" after desk.create_hub succeeds
    // (and after the create-folder path a personal workspace takes) — the
    // completion signal for Step 1.
    this._onWorkspaceRefresh = (payload) => this.onWorkspaceCreated(payload);
    if (typeof RADIO_BROADCAST !== "undefined") {
      RADIO_BROADCAST.on("workspace:refresh", this._onWorkspaceRefresh);
    }

    // Hold the user here until the flow is finished. Started unconditionally:
    // every step of this flow is one the user must not leave, so unlike
    // reward-flow's guard there is no step test to arm it against.
    this._exitGuard = new ExitGuard(this);
    this._exitGuard.start();
  }

  onDomRefresh() {
    this._captureHost();
    this._portalToBody();
    this._render();
  }

  /**
   * The flow is fed into the desk `overlay` part — a full-viewport backdrop
   * that, when open, is `pointer-events:auto` and would swallow clicks meant
   * for the real desk chrome the walkthrough points at (the vignette/cutout are
   * `pointer-events:none` and pass the click down, but the overlay element then
   * catches it). Neutralise its pointer-events while we're active. Captured
   * BEFORE the portal below, while our root is still inside it.
   */
  _captureHost() {
    if (!this.el?.closest) return;
    const host = this.el.closest(".desk-module__overlay");
    if (!host?.style) return;
    this._host = host;
    this._hostPE = host.style.pointerEvents;
    host.style.pointerEvents = "none";
  }

  /**
   * Re-parent our root to document.body. The desk `overlay` part is a stacking
   * context nested (z 10010) far below the window-manager wrapper-modal that
   * hosts the create-workspace form and the invite surfaces (--z-index-modal,
   * 100000). Trapped inside the overlay, NO z-index on the flow can lift the
   * coach above that modal, and its Back would be unclickable. At document.body
   * the root escapes every desk stacking context and its own z-index competes
   * at the true document root (see skin). Event routing is unaffected
   * (uiHandler is a JS reference).
   */
  _portalToBody() {
    if (!this.el || typeof document === "undefined") return;
    if (this.el.parentElement !== document.body) {
      document.body.appendChild(this.el);
    }
  }

  _restoreHost() {
    const host = this._host;
    if (!host?.style) return;
    host.style.pointerEvents = this._hostPE || "";
    this._host = null;
  }

  onBeforeDestroy() {
    this._unbind();
  }

  _unbind() {
    if (this._onUploaded && typeof RADIO_MEDIA !== "undefined") {
      RADIO_MEDIA.off(_e.uploaded, this._onUploaded);
      this._onUploaded = null;
    }
    if (this._onWorkspaceRefresh && typeof RADIO_BROADCAST !== "undefined") {
      RADIO_BROADCAST.off("workspace:refresh", this._onWorkspaceRefresh);
      this._onWorkspaceRefresh = null;
    }
    if (this._onStepResize && typeof window !== "undefined") {
      window.removeEventListener("resize", this._onStepResize);
      this._onStepResize = null;
    }
    // Unconditionally, not through any arming predicate: by the time _unbind
    // runs the flow is leaving whatever its step still says, and a guard
    // outliving the widget would hold a desk that no longer has a flow on it —
    // with no way for the user to release it.
    if (this._exitGuard) this._exitGuard.stop();
    if (this._nudgeTimer) {
      clearTimeout(this._nudgeTimer);
      this._nudgeTimer = null;
    }
    this._stopCreateGuide();
    this._stopUploadGuide();
    this._stopInviteWatch();
    this._clearOpenTimer();
    this._stopTargetTrack();
    this._stopStepTargetWatch();
    this._restoreHost();
    this._watchInviteBackdrop(false);
    this._markInviteOverlay(false);
  }

  // ───────── walkthroughs ─────────

  /**
   * Lazily build and start the Step 1 walkthrough. `./guide-create` is required
   * lazily so this orchestrator stays requirable (and unit-testable) under
   * Node — the guide no-ops when there is no DOM.
   *
   * @param {String} [pinAt] sub-step to hold until its surface is on screen.
   */
  _startCreateGuide(pinAt) {
    // Each run establishes its own workspace. Back → Continue restarts Step 1
    // and the user may pick a different type this time, so the previous
    // attempt's result must not carry over. The workspace that attempt made is
    // left behind on the server; reward-flow does the same, and untangling it
    // is a bigger question than this flow should answer on its own.
    this._workspace = null;
    if (!this._createGuide) {
      const { ActivateCreateGuide } = require("./guide-create");
      this._createGuide = new ActivateCreateGuide(this);
    }
    // Before start(), which reconciles once as it comes up: the pin is what
    // that first pass reads, so setting it after would be too late.
    if (pinAt) this._createGuide.pinAt(pinAt);
    this._createGuide.start();
  }

  _stopCreateGuide() {
    if (this._createGuide) this._createGuide.stop();
  }

  /** Lazily build and start the Step 3 walkthrough, for the same reason. */
  _startUploadGuide() {
    if (!this._uploadGuide) {
      const { ActivateUploadGuide } = require("./guide-upload");
      this._uploadGuide = new ActivateUploadGuide(this);
    }
    this._uploadGuide.start();
  }

  _stopUploadGuide() {
    if (this._uploadGuide) this._uploadGuide.stop();
  }

  /** The Step 2 surface observer (see guide-invite.js), built on first use. It
   *  owns both routes' watching; the orchestrator only says what the outcomes
   *  mean. */
  _invites() {
    if (!this._inviteWatch) this._inviteWatch = new InviteSurfaces(this);
    return this._inviteWatch;
  }

  _stopInviteWatch() {
    if (this._inviteWatch) this._inviteWatch.stop();
  }

  /**
   * Give up on a workspace window that never appeared and hand the user back
   * the Step 3 card, whose button asks for it again.
   *
   * The descriptor is deliberately KEPT, unlike reward-flow's equivalent, which
   * drops it and falls through to a card that uploads from the desk topbar
   * instead. There is no such fallback here — Step 3 exists to put the file in
   * the workspace Step 1 made — so forgetting it would leave a card whose only
   * button has nothing to open. A retry is the better failure.
   */
  _armOpenTimer() {
    this._clearOpenTimer();
    this._openTimer = setTimeout(() => {
      this._openTimer = null;
      if (this._step !== "step3_guide") return;
      if (this._uploadGuide?._sub) return; // it landed
      this._stopUploadGuide();
      this._goto("step3");
    }, OPEN_WORKSPACE_TIMEOUT_MS);
  }

  _clearOpenTimer() {
    if (this._openTimer) {
      clearTimeout(this._openTimer);
      this._openTimer = null;
    }
  }

  /**
   * Close the workspace this flow opened, as the closing modal appears.
   *
   * Drives the window's OWN close service rather than calling
   * Desk.onWorkspaceClosed() or clearing headlessLayer directly: window_folder
   * counts the surviving workspace tabs first and only tears the desk back down
   * to "no workspace open" (breadcrumb, sidebar tree, layer) when this was the
   * last one. A user who already had other workspaces open keeps them.
   */
  _closeWorkspace() {
    if (!this._workspace || typeof Wm === "undefined") return;
    if (typeof Wm._findWorkspaceWindow !== "function") return;
    const pane = Wm._findWorkspaceWindow(this._workspace.hub_id);
    if (!pane || pane.isDestroyed?.()) return;
    if (typeof pane.onUiEvent !== "function") return;
    // `cmd` is never dereferenced on this path: folder/index.js resolves the
    // service from args first (`args.service || cmd.service || cmd.mget(...)`),
    // and the base handler reads only `this`.
    pane.onUiEvent({}, { service: _e.close });
  }

  /**
   * Close the upload-progress window.
   *
   * Driven through the window's own close service so it unregisters from the
   * pool instead of just leaving the DOM. Called when Step 3's walkthrough
   * rewinds off a failed upload: those failed rows are what the guide reads as
   * "still failing", so the window has to go for the rewind to land anywhere.
   */
  closeUploadProgress() {
    if (typeof Wm === "undefined" || typeof Wm.getItemsByKind !== "function") {
      return;
    }
    const wins = Wm.getItemsByKind("window_upload_progress") || [];
    for (const w of wins) {
      if (!w || w.isDestroyed?.() || typeof w.onUiEvent !== "function") continue;
      w.onUiEvent({}, { service: _e.close });
    }
  }

  /**
   * Close the create-workspace modal. The form is fed into Wm's `wrapper-modal`
   * part, so clearing that part closes it.
   *
   * Driven directly rather than by clicking the form's close button: the
   * framework debounces EVERY widget click globally for 300ms (letc
   * __handleClick shares one `_clickTimestap`), so a synthetic click issued
   * from within the user's own Back click is silently swallowed.
   */
  closeCreateForm() {
    if (typeof Wm === "undefined" || typeof Wm.ensurePart !== "function") return;
    Wm.ensurePart("wrapper-modal").then((p) => {
      if (typeof p?.clear === "function") p.clear();
    });
  }

  /**
   * Empty the shared wrapper-modal AND mark it closed.
   *
   * Emptying alone is not enough: with content gone but `data-state="open"`
   * still set, that host stays a full-viewport invisible blocker over the desk.
   * Used wherever the flow takes down a surface it handed the user to.
   */
  clearWrapperModal() {
    if (typeof Wm === "undefined" || !Wm.__wrapperModal) return;
    Wm.__wrapperModal.clear();
    if (Wm.__wrapperModal.el?.dataset) {
      Wm.__wrapperModal.el.dataset.state = "closed";
      delete Wm.__wrapperModal.el.dataset.guidedOverlay;
    }
  }

  /** Open/close the topbar Add-new dropdown (the desk owns the `addmenu` part).
   *  The `guided-*` services are the desk's generic names for these two, which
   *  it answers alongside the `reward-*` originals — see its onUiEvent. */
  setAddMenu(open) {
    this.triggerHandlers({ service: "guided-set-add-menu", open: !!open });
  }

  /** Expand/collapse the create flyout inside the merged topbar New menu. */
  setNewCreateMenu(open) {
    this.triggerHandlers({
      service: "guided-set-new-create-menu",
      open: !!open,
    });
  }

  /**
   * Paint the spotlight cutout over `rect` (a viewport-space DOMRect) and feed
   * the coach tooltip. Called by a guide as it walks the live desk chrome.
   *
   * @param {DOMRect} rect
   * @param {{text: string, showBack?: boolean, showNext?: boolean,
   *          nextDisabled?: boolean, above?: boolean, radius?: string,
   *          hole?: boolean}} opt
   */
  spotlight(rect, opt = {}) {
    if (!this.el) return;
    const {
      text, showBack = true, showNext = false, nextDisabled = false,
      above = false, radius = "", hole = true,
    } = opt;
    const cx = rect.left + rect.width / 2;
    if (hole === false) {
      // Dim EVERYTHING, spotlight nothing. A zero-size cutout still spreads its
      // 100vmax box-shadow over the whole viewport (see skin __cutout), and the
      // guide-scrim's clip-path hole collapses with it so every click is
      // caught. For a sub-step that only asks the user to read: cutting the
      // surface out would leave it fully lit — and when that surface is a
      // workspace window filling the screen, nothing would be dimmed at all.
      this._collapseHole();
    } else {
      // Rectangular cutout: clear the target's rect and dim only the rest — no
      // highlight ring. It matches the target's box and rounding EXACTLY:
      // padding it out would leak an undimmed ring of background around the
      // target, and a mismatched radius would show bright corners.
      this._paintHole(rect, radius || "4px");
    }
    // Nothing is spotlighted → there is no target to sit beside, so centre it.
    const anchor = hole === false
      ? coachCenter()
      : coachAnchor(rect, cx, { prefAbove: above });
    this.ensurePart("guide-callout").then((p) => {
      if (!p) return;
      p.feed(
        require("../../../libs/guided-flow/coach")(this, {
          text,
          style: anchor.style,
          side: anchor.side,
          showBack,
          showNext,
          nextDisabled,
          backService: "activate-back",
          nextService: "activate-guide-next",
        }),
      );
    });
  }

  /** Lay the hole over `box`, matching its rounding. */
  _paintHole(box, radius) {
    if (!this.el) return;
    this.el.style.setProperty("--cut-x", `${box.left}px`);
    this.el.style.setProperty("--cut-y", `${box.top}px`);
    this.el.style.setProperty("--cut-w", `${box.width}px`);
    this.el.style.setProperty("--cut-h", `${box.height}px`);
    this.el.style.setProperty("--cut-radius", radius || "8px");
  }

  /** Collapse the hole to nothing, which leaves the dim WHOLE rather than
   *  removing it: a zero-size cutout still spreads its 100vmax shadow over the
   *  viewport. Used both for a deliberately holeless sub-step and for a surface
   *  that has not arrived yet, where the alternative is a stale hole lighting up
   *  whatever has since moved under it. */
  _collapseHole() {
    if (!this.el) return;
    this.el.style.setProperty("--cut-x", "50vw");
    this.el.style.setProperty("--cut-y", "50vh");
    this.el.style.setProperty("--cut-w", "0px");
    this.el.style.setProperty("--cut-h", "0px");
    this.el.style.setProperty("--cut-radius", "0px");
  }

  /** Remove the coach callout. feed(null) does NOT empty a part — prepareData
   *  wraps null into [null], so the coach would be left on screen. Reset the
   *  collection instead. */
  clearSpotlight() {
    this.ensurePart("guide-callout").then((p) => {
      if (!p) return;
      if (typeof p.collection?.reset === "function") {
        p.collection.reset();
      } else if (typeof p.feed === "function") {
        p.feed(null);
      }
    });
  }

  // ───────── skeleton accessors ─────────

  getStep() { return this._step; }

  /** True once Step 1 has left us a workspace to reopen. Read by the skeleton,
   *  which centres the Step 3 card and lifts the root clear of the window. */
  hasWorkspace() { return !!this._workspace; }

  /** True while Step 2 is being served by the permission panel rather than the
   *  invite popup. Read by the skeleton: the panel is the surface in play, so
   *  the card points at no topbar control and lifts clear of the modal. */
  invitePanelOpen() { return !!this._invitePanelOpen; }

  /** True while the invite-sent confirmation stands in the surface's place.
   *  Read by the skeleton so a re-render keeps the card hidden. */
  inviteToastOpen() { return !!this._inviteToastOpen; }

  _isWaiting() { return isWaiting(this._step); }

  // ───────── state ─────────

  _render() {
    this.feed(require("./skeleton")(this));
    this._positionStepTarget();
  }

  /**
   * Move to `step`, arm the surface treatment that state needs, and re-render.
   * Nothing is persisted: the flow is one session long, and a reload ends it
   * rather than resuming it.
   */
  _goto(step) {
    this._step = step;
    // While a real Step 2 surface is open (step2_waiting), take the default
    // frosted glass off its wrapper-modal and guard the backdrop against a
    // stray click abandoning the flow.
    //
    // "bare" for both routes: our own cutout is dimming the whole viewport
    // around the surface, and a second layer of the same colour on top of the
    // part of the screen that modal happens to cover is exactly what makes the
    // desk read darker than the topbar and sidebar beside it.
    this._markInviteOverlay(step === "step2_waiting" && "bare");
    this._watchInviteBackdrop(step === "step2_waiting");
    this._render();
  }

  /**
   * Steps 2 and 3 can point at a real topbar control. Measure it, lay the
   * cutout over it so it reads clear while the rest stays dimmed, and anchor the
   * card just beneath it.
   *
   * Deferred a frame so the freshly-fed skeleton is in the DOM, and re-run on
   * resize since the topbar reflows.
   */
  _positionStepTarget() {
    if (typeof document === "undefined" || typeof requestAnimationFrame !== "function") return;
    this.trackStepTarget();
    this._watchStepTarget();
    if (!this._onStepResize && typeof window !== "undefined") {
      this._onStepResize = () => this._applyStepTarget();
      window.addEventListener("resize", this._onStepResize, { passive: true });
    }
  }

  /**
   * Keep the cutout on its target while the DESK moves underneath it.
   *
   * The frame loop below only covers the moment a step renders. The desk
   * relayouts later for reasons of its own, and one of them is caused by this
   * very flow: stepping back out of Step 3 closes the workspace, which rebuilds
   * the topbar — moving the Invite button that Step 2 spotlights. A hole
   * measured before that lands on whatever has since slid into its place.
   *
   * Attributes are watched through a FILTER, never wholesale: the invite popup
   * opens its dropdowns by flipping `data-state`, with no DOM change to see, so
   * childList alone would miss the moment the hole needs to grow around one.
   * `style` is deliberately not in the filter — that is where this writes the
   * --cut-* vars itself, and watching it would feed straight back.
   *
   * Coalesced to one measurement per frame, because the desk mutates constantly
   * (chat, badges) and this must not turn into a measurement per mutation.
   */
  _watchStepTarget() {
    if (this._targetObs || typeof MutationObserver === "undefined") return;
    if (!document.body) return;
    this._targetObs = new MutationObserver(() => {
      if (this._targetTick) return;
      this._targetTick = requestAnimationFrame(() => {
        this._targetTick = null;
        if (this.el) this._applyStepTarget();
      });
    });
    this._targetObs.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-state", "class", "data-visible"],
    });
  }

  _stopStepTargetWatch() {
    if (this._targetObs) {
      this._targetObs.disconnect();
      this._targetObs = null;
    }
    if (this._targetTick && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this._targetTick);
    }
    this._targetTick = null;
  }

  /**
   * Follow the cutout's target while it is still moving.
   *
   * One measurement is not enough for a target that animates into place. The
   * permission panel is the case that proved it: it starts fully off-screen and
   * slides in over half a second (`right: -360px` → `0` with `transition: right
   * .5s`, see its skin). A CSS transition emits no DOM mutations, so nothing
   * asks us to measure again — the hole keeps whatever position the panel had
   * on the one frame we looked, which leaves half the panel dimmed and a bright
   * band of desk beside it.
   *
   * So re-apply every frame for a window long enough to outlast that slide,
   * rather than trying to detect when it ends: transitionend does not fire for
   * a panel that was already in place, and the target can also be moved by
   * something with no event at all.
   *
   * It also has to WAIT for a target that is not there yet, which is the other
   * half of the same problem: Step 2's surfaces are lazily imported kinds, so
   * the popup can be fed a second or more after the click that asked for it.
   * The settle window restarts the moment the target appears, so a late arrival
   * is followed in exactly like a prompt one.
   *
   * Public because the Step 2 observer calls it as surfaces swap: the panel is
   * inserted before it has slid into place, and the confirmation replaces it
   * animating too.
   *
   * Cheap either way — one getBoundingClientRect per frame on one element,
   * bounded, and only while a step is still resolving where its hole goes.
   */
  trackStepTarget() {
    if (typeof requestAnimationFrame !== "function") return;
    this._stopTargetTrack();
    const giveUp = Date.now() + TARGET_WAIT_MS;
    let until = Date.now() + TARGET_SETTLE_MS;
    let arrived = false;
    const frame = () => {
      this._targetRaf = null;
      if (!this.el) return;
      const found = this._applyStepTarget();
      const now = Date.now();
      if (found && !arrived) {
        // Just landed: give it a fresh settle window so its entrance is
        // followed, however late it was.
        arrived = true;
        until = now + TARGET_SETTLE_MS;
      }
      if (now < until || (!found && now < giveUp)) {
        this._targetRaf = requestAnimationFrame(frame);
      }
    };
    this._targetRaf = requestAnimationFrame(frame);
  }

  _stopTargetTrack() {
    if (this._targetRaf && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(this._targetRaf);
    }
    this._targetRaf = null;
  }

  /**
   * Grow `rect` to take in any of the invite popup's dropdowns that are open.
   *
   * Those lists are absolutely positioned and hang past the popup's bottom edge,
   * so a hole cut to the popup alone leaves an open one half lit and half in the
   * dim — which is what the "Search workspace to add" list looked like. The
   * cutout has exactly one hole, so it takes the bounding box of the two: they
   * are flush against each other, so the box stays tight.
   *
   * The union itself is pure and lives in libs/guided-flow/geometry; this half
   * is the DOM query and the visibility filter, which are this flow's own.
   *
   * @param {DOMRect} rect the popup's own box
   * @returns {{left, top, right, bottom, width, height}} the box to cut
   */
  _unionOverflow(rect) {
    if (typeof document === "undefined" || !document.querySelectorAll) return rect;
    const open = [];
    for (const el of document.querySelectorAll(POPUP_OVERFLOW)) {
      // They exist in the DOM closed, merely `visibility: hidden` — which still
      // measures — so ask whether they are really on screen.
      if (!onScreen(el)) continue;
      open.push(el.getBoundingClientRect());
    }
    return unionRects(rect, open);
  }

  /**
   * @returns {Boolean} false while a target this step EXPECTS is not on screen,
   *   so trackStepTarget knows to keep waiting for it. True once the hole is
   *   painted, and true for the steps that spotlight nothing at all — there is
   *   nothing to wait for there.
   */
  _applyStepTarget() {
    if (!this.el) return true;
    // Resolved from the BASE step, so entering a waiting state keeps the cutout
    // and the card exactly where they were instead of snapping to the fallback.
    const base = baseStep(this._step);
    const waiting = this._isWaiting();
    // Step 2 served by the permission panel rather than the invite popup.
    const onPanel = base === "step2" && this._invitePanelOpen;
    const notarget = isCentredStep(base, onPanel);
    const spot = stepSpotSelector({ base, waiting, onPanel, notarget });

    const anchor = this.el.querySelector(`.${this.fig.family}__anchor`);
    if (notarget) this._clearCardPlacement(anchor);

    const found = this._paintStepHole(spot, { base, waiting, onPanel });

    // Centred states have no card placement to do.
    if (notarget) return found;
    this._placeCardUnderControl(anchor, base);
    return found;
  }

  /**
   * Lay the hole over whatever `spot` selects, or collapse it when the surface is
   * not there yet.
   *
   * @param {String|null} spot selector, or null when this step spotlights nothing
   * @param {{base: String, waiting: Boolean, onPanel: Boolean}} ctx
   * @returns {Boolean} false only while a target this step EXPECTS is missing —
   *   which is what tells trackStepTarget to keep waiting for it.
   */
  _paintStepHole(spot, { base, waiting, onPanel }) {
    const spotEl = spot ? document.querySelector(spot) : null;
    const rect = spotEl?.getBoundingClientRect?.() || null;
    if (rect?.width && rect.height) {
      // On the popup route the hole grows to take in whichever of its dropdowns
      // is open, which hang outside its box.
      const box = base === "step2" && waiting && !onPanel
        ? this._unionOverflow(rect)
        : rect;
      // Cutout hugs the target exactly, mirroring its own rounding.
      const radius =
        (typeof getComputedStyle === "function" && getComputedStyle(spotEl).borderRadius) || "";
      this._paintHole(box, radius || "8px");
      return true;
    }
    if (spot) {
      // Expected a surface and it is not on screen yet (the popup opens a tick
      // after the click). Collapse the hole rather than leaving the last one
      // behind — that stale hole would be the topbar control we just moved off.
      this._collapseHole();
    }
    return !spot;   // nothing expected → nothing to wait for
  }

  /** Centred by the stylesheet. Clear any inline placement left over from a step
   *  that had a topbar target, otherwise a reused anchor element keeps the card
   *  pinned under the Invite button. */
  _clearCardPlacement(anchor) {
    if (!anchor?.style) return;
    anchor.style.left = "";
    anchor.style.top = "";
    anchor.style.right = "";
    anchor.style.transform = "";
  }

  /**
   * Hang the card under its topbar control — measured separately from the hole,
   * which on a waiting Step 2 is somewhere else entirely. A waiting Step 2 keeps
   * its card under the control it came from even though the hole has moved away:
   * the card must not jump the moment the popup opens.
   */
  _placeCardUnderControl(anchor, base) {
    if (!anchor?.style) return;
    const sel = STEP_TARGET[base];
    const ctrl = sel ? document.querySelector(sel) : null;
    const cr = ctrl?.getBoundingClientRect?.() || null;
    if (!cr?.width || !cr.height) return;
    const vw = (typeof window !== "undefined" && window.innerWidth) || 1280;
    const vh = (typeof window !== "undefined" && window.innerHeight) || 800;
    const M = 12;
    const CARD_W = 340;
    const CARD_H = 340;
    const half = CARD_W / 2;
    const cx = cr.left + cr.width / 2;
    const left = Math.min(Math.max(cx, M + half), vw - M - half);
    const top = Math.min(Math.max(cr.bottom + 16, 64), vh - CARD_H - M);
    anchor.style.left = `${left}px`;
    anchor.style.top = `${top}px`;
    anchor.style.right = "auto";
    anchor.style.transform = "translateX(-50%)";
  }

  /**
   * Mark the shared wrapper-modal that hosts a Step 2 surface so its backdrop
   * follows the flow instead of the app's glass overlay (see the shared skin).
   *
   * @param {"bare"|false} mode "bare" when the flow root is already painting the
   *   dim itself — the only value this is ever called with — or false to unmark.
   *   The other value the attribute takes, "1" (this host supplies the dim
   *   itself), is written by _openModal directly and never comes through here.
   */
  _markInviteOverlay(mode) {
    if (typeof Wm === "undefined" || !Wm.__wrapperModal?.el) {
      return;
    }
    const ds = Wm.__wrapperModal.el.dataset;
    // Was `mode === true ? "1" : mode`, which could never take its first branch:
    // every caller passes "bare" or false (`step === "step2_waiting" && "bare"`,
    // or a literal false). Inherited from reward-flow, whose copy has the same
    // dead branch. Dropped rather than "fixed" to `==` — there was no comparison
    // to rescue, just a value this function is never given.
    if (mode) ds.guidedOverlay = mode;
    else delete ds.guidedOverlay;
  }

  /**
   * Guard the dimmed area around a Step 2 surface (step2_waiting).
   *
   * Every other surface of the flow already asks "Leave setup?" before it is
   * abandoned — the vignette on a card step, __guide-scrim during a
   * walkthrough. This sub-step has nothing of its own: our vignette is
   * transparent and click-through so the user can operate the popup, and the
   * wrapper-modal hosting it carries no click service, so clicking beside the
   * popup would do nothing at all.
   *
   * A listener on the HOST rather than a scrim of our own: the popup owns that
   * wrapper-modal at z 100000, so anything we rendered would have to be lifted
   * above it AND punched with a hole tracking the popup's rect. Asking
   * `closest` whether the click landed in the popup is exact by construction
   * and measures nothing.
   *
   * Capture phase, so this lands before any handler inside the wrapper-modal
   * gets to act on the same click.
   */
  _watchInviteBackdrop(on) {
    const host =
      (typeof Wm !== "undefined" && Wm.__wrapperModal?.el) || null;
    if (on) {
      if (this._onInviteBackdrop || !host) return;
      this._inviteBackdropHost = host;
      this._onInviteBackdrop = (e) => {
        // Nothing of ours on screen — the surface has gone and no confirmation
        // took its place, so this host is showing somebody else's business and
        // this listener has no business answering for it.
        if (!this._inviteBackdropHost?.querySelector(STEP2_SURFACES)) return;
        // A click ON either surface is the user working — including the
        // confirmation's own Close/✕, which is how Step 2 is COMPLETED, not
        // abandoned. Everything else on this host is the backdrop.
        const t = e.target;
        if (t?.closest?.(STEP2_SURFACES)) return;
        // …everything except our own card, which the backdrop can cover: this
        // host is full-viewport, and whether it lands above or below the flow
        // depends on how the desk resolves its stacking (see the skin's
        // over-modal lift). Where it lands above, the card is visible but every
        // click on it arrives HERE instead, so the Back and Skip the user is
        // looking at would do nothing. Route the click by geometry to the
        // control they aimed at — which matters more now than it did when this
        // host's other answer was a way out of the flow: Skip is the only way
        // past Step 2 for an account that cannot invite anyone.
        const onCard = this._cardHit(e);
        if (onCard) {
          e.stopPropagation();
          if (onCard === "back") this.onUiEvent({}, { service: "activate-back" });
          if (onCard === "skip") {
            this.onUiEvent({}, { service: "activate-skip-invite" });
          }
          return;
        }
        // A real backdrop click. Swallowed, like every other gesture that used to
        // reach the abandon guard.
        e.stopPropagation();
        this.nudge();
      };
      host.addEventListener("click", this._onInviteBackdrop, true);
      return;
    }
    if (!this._onInviteBackdrop) return;
    this._inviteBackdropHost?.removeEventListener(
      "click", this._onInviteBackdrop, true,
    );
    this._onInviteBackdrop = null;
    this._inviteBackdropHost = null;
  }

  /**
   * Where a backdrop click landed relative to the step card, by geometry.
   *
   * The card is ours and is on screen; a click inside it is never an abandon
   * gesture, whichever layer actually received the event. Used only by the
   * backdrop guard, to keep a covered card operable — see _watchInviteBackdrop.
   *
   * @returns {"back"|"skip"|"card"|null} the control the click landed on, or
   *   null when it missed the card entirely (the real backdrop).
   */
  _cardHit(e) {
    if (!this.el || typeof this.el.querySelector !== "function") return null;
    const pfx = this.fig.family;
    const inside = (sel) => {
      const el = this.el.querySelector(sel);
      if (!el || typeof el.getBoundingClientRect !== "function") return false;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      return e.clientX >= r.left && e.clientX <= r.right
        && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    if (!inside(`.${pfx}__card`)) return null;
    if (inside(`.${pfx}__skip`)) return "skip";
    return inside(`.${pfx}__btn--ghost`) ? "back" : "card";
  }

  /**
   * Step the card aside while the invite-sent confirmation is up.
   *
   * That confirmation is a card in its own right — brand header, its own
   * message, its own Close — centred on the same screen. Ours behind it
   * restates a step the user has just completed and leaves a second, unrelated
   * Back sticking out from under it. The dim and the cutout stay: the hole is
   * on the confirmation by then (see _applyStepTarget), so the flow still owns
   * the screen around it.
   *
   * Marked on the root imperatively, like the drop guard's lift, so showing or
   * hiding the card never re-renders the flow — a re-render here would restart
   * the card's entry animation and empty the part the drop guard lives in. The
   * skeleton reads the same flag, so a re-render from elsewhere agrees.
   */
  markInviteToast(on) {
    const next = !!on;
    if (this._inviteToastOpen === next) return;   // observer fires constantly
    this._inviteToastOpen = next;
    const root =
      this.el?.querySelector?.(`.${this.fig.family}__root`) || this.el;
    if (!root?.dataset) return;
    if (next) root.dataset.toast = "1";
    else delete root.dataset.toast;
  }

  // ───────── external completion signals ─────────

  /**
   * A workspace was created (media_form → the RADIO_BROADCAST
   * "workspace:refresh" this subscribes to). Only meaningful while guiding.
   *   - Personal (payload.personal): a folder, no follow-up panel → Step 2.
   *   - Internal/External: a permission panel opens next; hand off to the guide
   *     to spotlight it. The internal branch ends Step 1 there (onInvitePanel),
   *     because that panel IS Step 2; the external one runs its perm phase to
   *     completion and lands on the Step 2 card.
   */
  onWorkspaceCreated(payload) {
    if (this._step !== "step1_guide") return;
    // Remember it for Step 3, which reopens this exact workspace. media_form
    // sends the descriptor on both creation paths.
    const ws = readDescriptor(payload?.workspace);
    if (ws) this._workspace = ws;
    if (payload?.personal) {
      // A personal workspace is a folder at the home root, not a hub: nothing
      // opens after it, so there is no perm phase to wait through. Routed
      // through the same completion as the external branch so the
      // no-descriptor case is handled in one place.
      return this.onCreateGuideComplete();
    }
    // The area picks the guide's safety budget for the follow-up surface: the
    // external branch's is a lazily imported window and needs far longer than
    // the internal branch's panel. Passed even when the descriptor was
    // unusable (undefined → the guide waits the long budget).
    if (this._createGuide) this._createGuide.onWorkspaceCreated(ws?.area);
    else this.onCreateGuideComplete();
  }

  /**
   * The walkthrough reached the INTERNAL (team) permission panel — the surface
   * that invites members. That IS what Step 2 asks for, so the flow enters
   * Step 2 on it rather than trailing Step 1 and then asking for the same thing
   * again on a card.
   *
   * Step 1 ENDS here: the walkthrough is stopped and the Step 2 card takes the
   * coach's place. Running the two side by side does not work — the guide and
   * the card both drive the --cut-* vars and both claim the overlay, and a
   * walkthrough state renders no card at all.
   *
   * The external (secure-share) branch is NOT this: it opens a share dock, not
   * an invite panel, so it stays inside Step 1 and lands on the Step 2 card.
   */
  onInvitePanel() {
    if (this._step !== "step1_guide") return;
    this._invitePanelOpen = true;
    // Stop the walkthrough BEFORE re-rendering: stop() clears the coach through
    // the `guide-callout` part, which the card layout does not have.
    this._stopCreateGuide();
    // The panel is a real surface the user now operates, which is exactly what
    // step2_waiting means. It brings the whole handoff treatment with it: card
    // visible with the step-2 progress, our own vignette off so the panel is
    // reachable, the wrapper-modal tinted to the flow's dim, and a click beside
    // the panel guarded (both armed by _goto).
    this._goto("step2_waiting");
    this._awaitPanelClosed();
  }

  /**
   * Hold Step 2 while the user works the permission panel, and act on what they
   * do with it. Nothing reports this panel to us — the desk reports the invite
   * popup for itself (onInvitePopupClosed) but not this — so it is observed;
   * see guide-invite.js for the watching.
   *
   * THREE EXITS, and only the first is reward-flow's:
   *   sent    → Step 2 is done; the confirmation that REPLACED the panel is
   *             dismissed and the flow moves to Step 3.
   *   closed  → the Step 2 CARD, with its Invite and its Skip. reward-flow
   *             rewinds to Step 1's create form here, on the reasoning that
   *             closing the panel is a Back; this flow does not, because that
   *             leaves the workspace the user just made orphaned and loops a
   *             user who simply has nobody to invite. Forward to the card,
   *             where Back is still one press away if they meant it.
   *   missing → the same card. A panel that never arrives is not a step the
   *             user should be held on.
   */
  _awaitPanelClosed() {
    this._invites().awaitPanelClosed({
      onSent: () => this._leavePanel("step3"),
      onClosed: () => this._leavePanel("step2"),
      onMissing: () => this._leavePanel("step2"),
    });
  }

  /** Common teardown for every way out of the panel: drop the panel flags, take
   *  the confirmation marker off, and land on `step`. Deferred a microtask —
   *  the observer fires DURING the panel's removal unwind, so let that settle
   *  before rendering the next state over the same host. */
  _leavePanel(step) {
    this._invitePanelOpen = false;
    this.markInviteToast(false);
    Promise.resolve().then(() => {
      if (this.isDestroyed?.()) return;
      this._goto(step);
    });
  }

  /**
   * The Step 1 walkthrough is done — the workspace exists and any follow-up
   * panel has been closed.
   *
   * A run that arrives here with no descriptor stops here too. All three create
   * paths broadcast one (media_form sends hub_id and nid on each), so this means
   * a payload that came back without the ids — and Step 3 is nothing but
   * "reopen that workspace and upload into it", so its card would carry a button
   * that cannot act. Ending quietly is the honest outcome: the workspace the
   * user just made is real and is theirs, and neither a dead card nor a closing
   * modal claiming a file was uploaded would be true.
   */
  onCreateGuideComplete() {
    if (this._step !== "step1_guide") return;
    this._stopCreateGuide();
    if (!this._workspace) return this._finish();
    this._goto("step2");
  }

  /** An invitation was sent successfully from the POPUP. The popup closes right
   *  after this, so we only LATCH the success here and let onInvitePopupClosed
   *  drive the advance to Step 3. Relayed by the desk, which owns the popup. */
  onInvitationSent() {
    if (this._step !== "step2_waiting") return;
    this._inviteSucceeded = true;
    // The backdrop guard stays armed across the handover to the confirmation:
    // Step 2 is not finished until that card is closed, which is what advances
    // to Step 3 (see onInvitePopupClosed → awaitToastDismissed).
  }

  /** The invite popup closed. Two cases:
   *  - it closed because the send succeeded → advance to Step 3;
   *  - it closed without sending → re-arm Step 2 so the user can retry, or
   *    Skip. */
  onInvitePopupClosed() {
    // We are the ones closing it, on the way out (see _finish).
    if (this._finishing) return;
    if (this._inviteSucceeded) {
      this._inviteSucceeded = false;
      // The success toast (invite-popup's Wm.alert notice) is about to take the
      // shared wrapper-modal's place. Keep the flow's backdrop tint on for it
      // and HOLD: Step 3 only takes over once the user dismisses that toast, so
      // the confirmation isn't buried under the step card's own vignette the
      // instant it appears.
      this._invites().awaitToastDismissed(() => {
        this._markInviteOverlay(false);
        this._goto("step3");
      });
      return;
    }
    // Closed without sending — drop the tint and re-arm Step 2 to retry.
    this._markInviteOverlay(false);
    if (this._step !== "step2_waiting") return;
    this._goto("step2");
  }

  /**
   * A file upload completed — the LAST step, but not the end of it.
   *
   * The walkthrough has two beats left, spotlighting the upload in progress and
   * then the files panel it landed in (see guide-upload). Finishing here would
   * tear the workspace down in the same frame the first file arrived, so the
   * user never sees the thing the whole step was for. The guide's last Next
   * comes back through onUploadGuideComplete.
   */
  onUploadDone() {
    if (this._step !== "step3_guide") return;
    if (this._uploadGuide) this._uploadGuide.onUploaded();
  }

  /** The Step 3 walkthrough's final beat was dismissed — the user has seen
   *  their files. Called by the guide's Next on the "files" sub-step. */
  onUploadGuideComplete() {
    if (this._step !== "step3_guide") return;
    this._complete();
  }

  /**
   * Every step is done: close the workspace the flow opened and show the
   * closing modal.
   *
   * The workspace goes because the flow opened it, not the user — the desk is
   * handed back at Home, the way they left it. Unlike reward-flow's equivalent
   * there is nothing to claim and nobody to ask, so this is the whole ending.
   */
  _complete() {
    this._stopUploadGuide();
    this._clearOpenTimer();
    this._closeWorkspace();
    this._step = "done";
    // Re-render BEFORE opening the modal. stop() only clears the coach; the
    // cutout and the full-viewport __guide-scrim stay in the markup, and a
    // guiding root outranks the wrapper-modal that hosts the modal — leaving
    // them would grey the card out and eat its button.
    this._render();
    // "bare": the re-render above leaves a full-viewport vignette behind the
    // modal, so the wrapper-modal must not stack a second dim on top of it.
    if (!this._openModal(doneModal(this), "bare")) this._finish();
  }

  // ───────── modals ─────────

  /**
   * @returns {boolean} false when there is no modal host to render into —
   *   callers decide whether that is fatal for their step.
   */
  _openModal(tree, overlay = "1") {
    if (typeof Wm === "undefined" || !Wm.__wrapperModal) return false;
    Wm.__wrapperModal.feed(tree);
    Wm.__wrapperModal.el.dataset.state = "open";
    Wm.__wrapperModal.el.dataset.overlay = "blur";
    // Align the backdrop with the flow's own dim (--overlay-bg) instead of the
    // app's frosted-glass blur, so the modal reads as part of the same overlay
    // as the vignette. "bare" when the flow root is ALREADY painting a
    // full-viewport vignette behind it: the glass still has to go, but a second
    // dim of the same colour would just double the darkness. See the skin.
    Wm.__wrapperModal.el.dataset.guidedOverlay = overlay;
    this._modalOpen = true;
    return true;
  }

  _closeModal() {
    if (!this._modalOpen) return;
    if (typeof Wm !== "undefined" && Wm.__wrapperModal) {
      Wm.__wrapperModal.clear();
      Wm.__wrapperModal.el.dataset.state = "closed";
      delete Wm.__wrapperModal.el.dataset.overlay;
      delete Wm.__wrapperModal.el.dataset.guidedOverlay;
    }
    this._modalOpen = false;
  }

  /**
   * Acknowledge a gesture that was swallowed.
   *
   * The flow offers no way out, so a click on the dim, a Back press and a
   * refresh keystroke all end in nothing happening. Nothing happening is
   * indistinguishable from a broken page, so the card gives a short pulse: it
   * says "I saw that, and the answer is no" without putting a dialog between the
   * user and the step they are on.
   *
   * Marked on the card imperatively rather than through a re-render, for the same
   * reason as the --cut-* vars and the toast flag: re-rendering would restart the
   * card's entry animation and rebuild the parts underneath it. The attribute is
   * cleared once the animation has had time to run, so a second gesture pulses
   * again rather than doing nothing (an attribute that is already set restarts no
   * CSS animation).
   */
  nudge() {
    const card = this.el?.querySelector?.(`.${this.fig.family}__card`);
    if (!card?.dataset) return;
    if (this._nudgeTimer) {
      clearTimeout(this._nudgeTimer);
      this._nudgeTimer = null;
    }
    delete card.dataset.nudge;
    // Next frame, so the removal above has landed and the animation re-runs.
    // Without the gap a rapid second press sets an attribute that is already
    // set, and nothing moves.
    const arm = () => {
      if (!this.el || this.isDestroyed?.()) return;
      card.dataset.nudge = "1";
      this._nudgeTimer = setTimeout(() => {
        this._nudgeTimer = null;
        delete card.dataset.nudge;
      }, NUDGE_MS);
    };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(arm);
    else arm();
  }

  /**
   * The end of the flow, and the only thing that releases the exit guard.
   *
   * Three ways here, and the user asks for exactly one of them:
   *   - the closing modal's button, after every step is done;
   *   - a run that cannot be completed, which ends rather than trapping the user
   *     on an unusable desk (no workspace descriptor at all; a Step 3 workspace
   *     that no longer opens);
   *   - the widget being destroyed under it, e.g. a route change taking the desk
   *     module down.
   *
   * Nothing is written anywhere. The flow runs once because it is chained to the
   * end of the product tour and nothing else re-triggers it, so there is no latch
   * to set — which also means an interrupted run is gone for good, the same as a
   * completed one. Closing that gap needs persisted state and a re-trigger; see
   * the design doc's Tier 2 note.
   */
  _finish() {
    // Once. Several paths land here, and the modal's button can be pressed twice
    // before the teardown below has run.
    if (this._finishing) return;
    // Latched BEFORE the surfaces are cleared: clearing the invite popup fires
    // the desk's destroy hook, which calls straight back into
    // onInvitePopupClosed — and that would read step2_waiting and re-render a
    // flow that is on its way out.
    this._finishing = true;
    this._closeModal();
    // Stop the walkthroughs BEFORE tearing their surfaces down: a guide's
    // observer would otherwise read the create form vanishing as the user
    // having closed it, and complete a step on a flow that is already leaving.
    this._unbind();
    this._closeHandoffSurfaces();
    this.softDestroy();
  }

  /**
   * Take down the surfaces the flow HANDED THE USER TO, on the way out.
   *
   * Reached from "Leave setup". None of them is ours — they are other widgets,
   * opened because the walkthrough walked the user into them — but that is
   * exactly why they cannot be left behind: they strand on a desk whose flow no
   * longer exists, with nothing left to close them. For the wrapper-modal it is
   * worse than untidy: emptied and still `data-state="open"` it is an invisible
   * full-viewport blocker over the desk.
   *
   * Gated on the step, so an exit from anywhere else — the closing modal's own
   * button — cannot reach in and shut something the user opened for themselves.
   */
  _closeHandoffSurfaces() {
    const guided = this._step === "step1_guide";
    if (guided || this._step === "step2_waiting") {
      // The shared wrapper-modal. At these two steps whatever sits in it is
      // there because of us: Step 1's create form or its follow-up permission
      // panel (media_form feeds `permission_restricted` into this same host),
      // or Step 2's invite popup and the confirmation that replaces it.
      this.clearWrapperModal();
      // The perm phase's OTHER branch. An external ("share") workspace opens
      // the secure-share dock as a real WINDOW (media_form → Wm.launch), not
      // into the wrapper-modal, so clearing that host does not touch it. Same
      // sub-step, same abandonment, same orphan.
      if (guided) this._closeSecureShare();
      return;
    }
    // The workspace window, and anything still uploading into it. Both are the
    // flow's doing — the user did not open them, "Upload your first file" did.
    if (baseStep(this._step) === "step3") {
      this.closeUploadProgress();
      this._closeWorkspace();
    }
  }

  /** Close the secure-share dock the Step 1 create step may have launched.
   *  Driven through the window's own close service, like _closeWorkspace, so it
   *  unregisters from the pool instead of just leaving the DOM. During the
   *  walkthrough the flow owns the screen, so any such window is the one that
   *  step just opened. */
  _closeSecureShare() {
    if (typeof Wm === "undefined" || typeof Wm.getItemsByKind !== "function") {
      return;
    }
    const wins = Wm.getItemsByKind("window_secure_share") || [];
    for (const w of wins) {
      if (!w || w.isDestroyed?.() || typeof w.onUiEvent !== "function") continue;
      w.onUiEvent({}, { service: _e.close });
    }
  }

  /**
   * Reopen the workspace Step 1 created, so the upload lands there.
   *
   * loadWorkspace is the same entry point the sidebar rows use; it resolves the
   * root and mounts the workspace pane.
   *
   * @returns {Boolean} false when there is nothing to open — the card stays put
   *   rather than starting a walkthrough with no workspace to walk.
   */
  _openWorkspace() {
    if (!this._workspace) return false;
    if (typeof Wm === "undefined" || typeof Wm.loadWorkspace !== "function") {
      return false;
    }
    Wm.loadWorkspace({ ...this._workspace });
    return true;
  }

  /**
   * Can this account invite anyone at all?
   *
   * The desk's own invite path declines for a free solo plan and shows the plan
   * limit instead of opening the popup (see _openInvitePopup → isFreeSoloPlan),
   * which is exactly the account a flow chained to the post-signup tour is
   * running for. Asking the same question here is what keeps Step 2 from
   * entering `step2_waiting` to wait for a popup that will never be fed: the
   * desk still says its piece, the card stays put, and Skip is the way on.
   *
   * Errs toward "yes" when billing cannot answer: the cost of being wrong that
   * way is the pre-existing behaviour (a waiting state the user leaves with
   * Back or Skip), while being wrong the other way withholds a step from
   * someone entitled to it.
   */
  _canInvite() {
    try {
      const { isFreeSoloPlan } = require("libs/billing");
      return typeof isFreeSoloPlan === "function" ? !isFreeSoloPlan() : true;
    } catch (e) {
      // WHAT CAN THROW HERE: the require itself, if libs/billing is ever absent
      // from a build, and isFreeSoloPlan(), which reads Visitor.quota() and so
      // depends on the session being loaded.
      //
      // Answered "yes, they can invite" — the same direction billing's own
      // function now fails in for an unknown seat count, and the direction the
      // docblock above argues for: being wrong this way costs a waiting state the
      // user leaves with Back or Skip, being wrong the other way withholds a step
      // from someone entitled to it.
      //
      // Logged rather than swallowed, because a broken billing lib quietly
      // reshaping onboarding is exactly the kind of thing that should be visible
      // once. This runs at most a few times per session (an invite click).
      if (this.warn) this.warn("[activate] plan check failed; allowing invite", e);
      return true;
    }
  }

  // ───────── event routing ─────────

  /**
   * Step 1's primary action: start the walkthrough that spotlights the real desk
   * chrome (New → Workspace item → the form) and lets the user create the
   * workspace themselves. onWorkspaceCreated ends it.
   */
  _onContinue() {
    if (this._isWaiting() || isGuiding(this._step)) return;
    this._goto("step1_guide");
    this._startCreateGuide();
  }

  /**
   * Step 2's primary action. The desk owns the popup, so this only asks for it —
   * unless the plan forbids inviting at all, in which case the desk shows its
   * limit notice and this stays on the card rather than entering a waiting state
   * nothing will ever end (see _canInvite).
   */
  _onInvite() {
    this.triggerHandlers({ service: "invite-member" });
    if (!this._canInvite()) return;
    this._goto("step2_waiting");
  }

  /**
   * Step 2 is the one step of the three a user can be unable to perform.
   * Skipping is a real answer, so it goes FORWARD, and the progress bar moves
   * with it.
   */
  _onSkipInvite() {
    if (baseStep(this._step) !== "step2") return;
    const surfaceOpen = this._isWaiting();
    this._stopInviteWatch();
    this._invitePanelOpen = false;
    this.markInviteToast(false);
    this._markInviteOverlay(false);
    // THE STEP MOVES FIRST, and the surface comes down after. Clearing the
    // wrapper-modal destroys the invite popup, which fires the desk's destroy
    // hook, which relays straight back into onInvitePopupClosed — and that reads
    // `step2_waiting` as "closed without sending" and sends the flow back to the
    // Step 2 card. Ordered this way it finds step3 and stands down. (_finish
    // latches `_finishing` for the same reason.)
    this._goto("step3");
    // Whatever Step 2 opened is in the shared wrapper-modal; skipping past a
    // surface still on screen would strand it over Step 3.
    if (surfaceOpen) this.clearWrapperModal();
  }

  /**
   * Step 3's primary action. The walkthrough starts either way: the window may
   * already be open (the user pressed Back out of the walkthrough and came
   * forward again), and loadWorkspace declining is not a reason to withhold the
   * guide from a workspace that is on screen. The open timer catches the case
   * where nothing mounts.
   */
  _onOpenWorkspace() {
    if (!this._openWorkspace()) {
      // NOTHING LEFT TO OPEN — the workspace was deleted in another tab, or Wm
      // cannot answer. This used to be a silent no-op, which was survivable
      // while a click on the dim still offered a way out of the flow. It is not
      // survivable now: the card's only control would do nothing, no exit is on
      // offer, and the user would be left on a desk they cannot use. A flow that
      // cannot be completed has to end.
      return this._finish();
    }
    this._goto("step3_guide");
    this._startUploadGuide();
    this._armOpenTimer();
  }

  /**
   * SWALLOWED. This used to raise "Leave setup?", which was the flow's own way
   * out; the flow is force-completed now, so the click lands on the dim and stops
   * there. The pulse is the whole response — see nudge().
   *
   * Fired by the vignette on a card step and by __guide-scrim during a
   * walkthrough. Both cover the whole viewport, so this is also what catches a
   * user clicking desk chrome the current step does not point at: the click is
   * absorbed rather than reaching a desk the flow has taken over.
   */
  _onVignetteClick() {
    if (this._modalOpen) return;
    this.nudge();
  }

  // ───────── the four things Back can mean ─────────

  /**
   * Back means one of four different things depending on where the flow is, and
   * naming them is what keeps this readable: step back inside a walkthrough,
   * close the Step 2 surface, or step back a whole card step.
   */
  _onBack() {
    if (this._step === "step1_guide") return this._backOutOfCreateGuide();
    if (this._step === "step3_guide") return this._backOutOfUploadGuide();
    // Back out of the permission panel. Closing it is what the panel's own X
    // does, and both land in the same place — the Step 2 card (see
    // _awaitPanelClosed). Driving the close rather than jumping there keeps one
    // exit path instead of two.
    if (this._invitePanelOpen) return this.clearWrapperModal();
    return this._backOneStep();
  }

  /** Inside Step 1's walkthrough, Back steps back one sub-step where it can.
   *  Only when there is nothing earlier does it tear the walkthrough down and
   *  return to the card it started from. */
  _backOutOfCreateGuide() {
    if (this._createGuide?.back()) return;
    this._stopCreateGuide();
    this._goto("step1");
  }

  /** Inside Step 3's walkthrough, one beat has a step-back of its own: a failed
   *  upload rewinds to the "+ New" pill so the user can try again (see
   *  guide-upload's back()). Everywhere else Back leaves the walkthrough for the
   *  card, workspace still open. */
  _backOutOfUploadGuide() {
    if (this._uploadGuide?.back()) return;
    this._stopUploadGuide();
    this._clearOpenTimer();
    this._goto("step3");
  }

  /**
   * Back from a card, or out of a waiting state onto its own card.
   *
   * Stepping out of Step 3 takes the workspace with it. The flow opened that
   * window itself, and Step 2 is about inviting someone from the DESK — its card
   * anchors to the desk topbar and its invite popup opens over it, both of which
   * a workspace window covers. Leaving it up also strands the user's own way
   * back: the card they land on offers to open a workspace that is already open.
   *
   * The descriptor is kept, so coming forward again reopens the same one.
   */
  _backOneStep() {
    const base = baseStep(this._step);
    if (this._isWaiting()) return this._goto(base);
    const prev = STEPS[STEPS.indexOf(base) - 1];
    if (!prev) return;
    if (base === "step3") this._closeWorkspace();
    this._goto(prev);
  }

  /**
   * Service dispatch, and nothing else.
   *
   * Deliberately a flat table: every case is one call, and what each service
   * MEANS lives in the method it names. This used to hold all of it inline and
   * had accumulated the branches of four separate features — the step
   * transitions, the invite handoff, the Skip, and the exit handling — which is
   * how one function ended up carrying most of the widget's control flow.
   */
  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd?.mget?.(_a.service);
    switch (service) {
      case "activate-continue":
        return this._onContinue();

      case "activate-invite":
        return this._onInvite();

      case "activate-skip-invite":
        return this._onSkipInvite();

      case "activate-open-workspace":
        return this._onOpenWorkspace();

      case "activate-guide-next":
        // Step 3's read-only beats carry a Next, having no real action to
        // observe: "folder" (this is your workspace) walks on to "+ New", and
        // "files" (here is what you uploaded) ends the walkthrough.
        return this._uploadGuide?.onNext();

      case "activate-back":
        return this._onBack();

      case "activate-vignette-click":
        return this._onVignetteClick();

      case "activate-finish":
        // The closing modal's only button.
        return this._finish();

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

__activate_workspace.initClass();
module.exports = __activate_workspace;
