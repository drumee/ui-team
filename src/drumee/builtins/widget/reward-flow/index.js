/**
 * Reward onboarding flow — Figma section 3275:236091.
 *
 * A 3-step activation flow for users arriving from the "Claim Your Free
 * Storage" marketing email:
 *
 *   step1          → "your workspace is ready", informational
 *   step1_guide    → the walkthrough that creates the workspace (see guide.js)
 *   step2          → "Invite member" fires the desk's "invite-member" service
 *   step2_waiting  → a real surface is open and the card waits beside it. Two
 *                    ways in: the members permission panel the walkthrough ends
 *                    on, which IS Step 2 — it is where members are invited — so
 *                    Step 1 hands straight over to it (onInvitePanel); or the
 *                    invite popup opened from the card, where
 *                    onInvitationSent() advances. Either way the step is
 *                    completed by an invitation actually going out: closing the
 *                    panel without sending one rewinds to step1_guide with the
 *                    create form re-opened (_awaitPanelClosed →
 *                    _resumeCreateForm). BOTH hub types take this route now
 *                    (team and share alike); only personal, which opens no
 *                    panel at all, lands on the step2 card first.
 *   step3          → "Upload" fires the desk's _e.upload service
 *   step3_waiting  → the real uploader is open; RADIO_MEDIA _e.uploaded advances
 *   step3_guide    → the walkthrough inside the workspace created in Step 1. It
 *                    outlives the upload: _e.uploaded moves it onto its
 *                    "uploading" and "files" beats (see guide-upload), and the
 *                    Next on the last one advances
 *   congrats       → modal, then the flow latches itself off for good
 *   soldout        → modal, same shape as congrats: the campaign's limited
 *                    slots are gone. Reached without a walkthrough at all when
 *                    the gate says so (opt.capped), or from step 3 when the
 *                    server refuses the claim (_completeStep3)
 *
 * A drop modal intercepts clicks on the vignette during the active steps.
 * The progress bar tracks the CURRENT step (step N lights N segments), so Back
 * rewinds it too.
 *
 * The storage itself is still granted out of band, but WHETHER a user is owed
 * it is the server's: yp.reward_claim holds the funnel, and the campaign is
 * capped at a fixed number of rewarded users — the widget asks for a slot on
 * completion and shows congrats or the sold-out notice depending on the answer.
 * See docs/superpowers/specs/2026-07-23-reward-onboarding-flow-design.md and
 * docs/superpowers/specs/2026-07-29-reward-slot-cap-design.md
 */
const { dropModal, congratsModal, soldOutModal } = require("./skeleton/modal");
const { STEPS, baseStep, isWaiting } = require("./steps");
const { readDescriptor } = require("../../../libs/guided-flow/descriptor");
// The guides' own visibility test, reused for the popup's dropdowns: presence in
// the DOM is not enough for something that is `visibility: hidden` until opened.
const { visible: onScreen } = require("../../../libs/guided-flow/guide-core");
// Mid-run scratch state — see storage.js. Eligibility and the resume point are
// the server's (reward.get_state); only this one key is still local.
const {
  KEY_WORKSPACE, runGet, runSet, runDel, purgeLegacyKeys,
} = require("./storage");
// Refresh and Back — the ways out the flow's own surfaces never saw.
// See exit-guard.js.
const { ExitGuard, armed: exitArmed } = require("./exit-guard");
// A POST that outlives the document, for the exits the guard above cannot
// intercept — an ordinary postService is cancelled the moment the page starts
// unloading. See beacon.js.
const { beaconPost } = require("./beacon");
// Where the coach callout goes — pure geometry, shared with the other guided
// flows. See libs/guided-flow/anchor.
const { coachAnchor, coachCenter } = require("../../../libs/guided-flow/anchor");

// Recorded on every funnel post so the row says which campaign it belongs to.
// Defined in libs/campaign, not here: the desk has to compare an arrival
// against this name before consuming it, and a module-local const in a
// lazily-loaded widget bundle is not reachable from there.
const { REWARD_CAMPAIGN: CAMPAIGN } = require("libs/campaign");

// How long "Open workspace" waits for the workspace window before giving up and
// dropping Step 3 to its legacy topbar-upload variant. Loading is a fetch plus
// a mount; anything past this is a failure, not slowness.
const OPEN_WORKSPACE_TIMEOUT_MS = 4000;

// How long the cutout keeps following its target once it is on screen (see
// _trackStepTarget). Sized to outlast the slowest entrance a target has: the
// permission panel's half-second slide, plus the tick before it starts.
const TARGET_SETTLE_MS = 900;
// How long Step 2 waits for a permission panel it asked to be REOPENED (the
// rewind from Step 3). Its kind is lazily imported, so the chunk has to be
// fetched before anything mounts; past this the flow gives up on it and shows
// the plain Step 2 card. Generous for the same reason as the guide's own
// window budget — the cost of waiting too long is a late card, the cost of
// waiting too little is a step the user never asked to leave.
const PANEL_OPEN_TIMEOUT_MS = 8000;

// How long it will WAIT for a target that has not appeared yet. The surfaces
// Step 2 spotlights are lazily imported kinds — the invite popup goes through
// Kind.waitFor("invite_popup") before it is even fed — so the chunk fetch can
// outlast any settle window, and a fixed one left the hole collapsed and the
// popup sitting in the dim.
const TARGET_WAIT_MS = 8000;

// How long "Drop anyway" waits for its status post before leaving anyway.
// That exit can be a RELOAD, and a request still in flight when the page goes
// is a request the funnel never sees — so this one post is awaited, alone with
// the completion claim. Bounded because the cost of waiting is a user staring
// at a guard they have already dismissed: past this, the funnel losing a row is
// the cheaper failure.
const DROP_POST_TIMEOUT_MS = 1500;

// The surfaces Step 2 hands the user to, all fed into the shared wrapper-modal:
// the members permission panel Step 1 ends on (onInvitePanel) OR the invite
// popup, then the invite-sent confirmation that REPLACES either of them on a
// successful send (Wm.alert → window_info). A click on any of them is the user
// working; a click beside them is the abandon gesture the flow guards.
const INVITE_POPUP = ".invite-popup__container";
const INVITE_PANEL = ".permission-restricted__main";
const INVITE_TOAST = ".window-info__ui, .window-info__main";
const STEP2_SURFACES = `${INVITE_POPUP}, ${INVITE_PANEL}, ${INVITE_TOAST}`;
// What Step 2 waits on while the user works the permission panel: the panel
// itself, or the confirmation that replaced it. Both gone = the step is done.
const PANEL_SURFACES = `${INVITE_PANEL}, ${INVITE_TOAST}`;
// The same pair for the other route in: the invite popup, and the confirmation
// that replaces it on a successful send. This is what the cutout spotlights
// while that route is waiting — see _applyStepTarget.
const POPUP_SURFACES = `${INVITE_POPUP}, ${INVITE_TOAST}`;

// The popup's own dropdowns, which are absolutely positioned and hang PAST its
// bottom edge (see its skin: `position: absolute; top: calc(100% + 4px)` with a
// max-height of its own). A hole cut to the popup alone leaves an open list half
// lit and half in the dim, so the hole takes them in — see _unionOverflow. Each
// is `visibility: hidden` until `data-state="1"`, so presence is not enough:
// they have to be measured for real visibility.
const POPUP_OVERFLOW = [
  ".invite-popup__suggestions",            // email suggestions
  ".invite-popup__workspace-suggestions",  // "Search workspace to add"
  ".invite-popup__role-options",           // the per-row role menu
].join(", ");

// The live topbar control each step points at. The cutout is laid over it and
// the card anchored beneath it (see _applyStepTarget).
const STEP_TARGET = {
  step2: ".desk-module-topbar__invite-btn",
  step3: ".desk-module-topbar__new-workspace-btn",
};

class __reward_flow extends LetcBox {
  static initClass() {
    require("./skin");
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();
    // One-off tidy of the keys this widget used to own before eligibility moved
    // to the server. Harmless if there are none.
    purgeLegacyKeys();

    // A ?reward=1 run was forced past the eligibility gate for testing. It must
    // not latch itself off on exit — see _finish.
    this._forced = !!opt.forced;

    // The campaign's limited slots are all taken (reward.get_state -> capped).
    // The user was invited, so they are TOLD rather than shown nothing: this
    // run has no walkthrough at all, just the sold-out notice. Checked before
    // the resume below because a capped run has nothing to resume into — the
    // server blanks `step` for exactly that reason.
    this._capped = !!opt.capped;

    // Resume point comes from the SERVER (reward.get_state -> reward_claim.step,
    // fed in by the desk gate), so a user who wandered off mid-walkthrough picks
    // up where they were even on a different device. baseStep still strips both
    // _waiting and _guide: the uploader / invite popup / walkthrough they were
    // handed off to is long gone, so every transient state resumes as its card
    // step.
    const stored = baseStep(opt.step);
    this._step = this._capped
      ? "soldout"
      : (STEPS.includes(stored) ? stored : "step1");
    this._modalOpen = false;
    this._inviteSucceeded = false;
    this._dropGuardOpen = false;
    // What the user was trying to do when the guard went up — a reload, a Back
    // press — so "Drop anyway" can carry it out instead of discarding it and
    // making them ask twice. Null when the guard was raised by a click on the
    // vignette, which is already where the user meant to be.
    this._pendingExit = null;
    // "Drop anyway" is in flight (its status post is awaited before the exit
    // fires), so a second click is ignored rather than finishing twice.
    this._leaving = false;
    // Step 2 is being served by the permission panel Step 1 ended on, not by
    // the invite popup — see onInvitePanel. Never restored on resume: the panel
    // is long gone by then, so a reload resumes on the plain Step 2 card.
    this._invitePanelOpen = false;
    // …and an invitation really went out from it, which is what separates
    // closing that panel as "done" from closing it as Back.
    this._inviteSent = false;
    // …and its confirmation is standing in the panel's place, which hides the
    // card behind it (see _markInviteToast).
    this._inviteToastOpen = false;
    // Furthest card step already reported to the server this session — see
    // _trackStep. Not persisted: re-posting a step after a reload is harmless
    // (the server keeps the furthest one) and losing one is not.
    this._trackedStep = null;
    // A descriptor left by an abandoned run must not pre-answer this one: only
    // trust it when RESUMING a run that already reached Step 2. A run that
    // starts at Step 1 will create its own workspace.
    // …and a capped run never resumes anything, so it has no use for one either.
    this._workspace =
      !this._capped && this._step !== "step1"
        ? readDescriptor(runGet(KEY_WORKSPACE))
        : null;
    if (!this._workspace) runDel(KEY_WORKSPACE);

    this._onUploaded = () => this.onUploadDone();
    if (typeof RADIO_MEDIA !== "undefined") {
      RADIO_MEDIA.on(_e.uploaded, this._onUploaded);
    }

    // media_form broadcasts "workspace:refresh" after desk.create_hub succeeds
    // — the completion signal that advances step 1, mirroring the invite signal
    // for step 2 and the upload signal for step 3.
    this._onWorkspaceRefresh = (payload) => this.onWorkspaceCreated(payload);
    // permission_restricted broadcasts this when a member is really invited
    // from the panel. It is what tells a closed panel apart from a completed
    // one — see _awaitPanelClosed.
    this._onPanelInvitation = () => this.onPanelInvitation();
    if (typeof RADIO_BROADCAST !== "undefined") {
      RADIO_BROADCAST.on("workspace:refresh", this._onWorkspaceRefresh);
      RADIO_BROADCAST.on("invitation:sent", this._onPanelInvitation);
    }

    // Started unconditionally: a capped run is turned away by exitArmed()
    // below, not by declining to watch, so there is one place that decides when
    // the guard speaks up.
    this._exitGuard = new ExitGuard(this);
    this._exitGuard.start();
  }

  onDomRefresh() {
    this._captureHost();
    this._portalToBody();
    this._render();
    // A capped run is not a run: there is no walkthrough to start, so posting
    // "started" would put a user who was never offered the flow into the middle
    // of the funnel. It reports nothing until the notice is dismissed, which is
    // what writes the terminal 'missed'.
    if (this._capped) return this._openSoldOut();
    // Mounting IS the "started" signal: the desk only feeds this widget once
    // reward.get_state has said yes, so nothing else has to gate it.
    this._trackStep(baseStep(this._step));
  }

  /**
   * The flow is fed into the desk `overlay` part — a full-viewport backdrop
   * that, when open, is `pointer-events:auto` and would swallow clicks meant for
   * the real desk chrome our Step 1 spotlight points at (the vignette/cutout are
   * `pointer-events:none` and pass the click down, but the overlay element then
   * catches it). Neutralise its pointer-events while we're active. Captured
   * BEFORE the portal below, while our root is still inside it.
   */
  _captureHost() {
    if (!this.el || !this.el.closest) return;
    const host = this.el.closest(".desk-module__overlay");
    if (!host || !host.style) return;
    this._host = host;
    this._hostPE = host.style.pointerEvents;
    host.style.pointerEvents = "none";
  }

  /**
   * Re-parent our root to document.body. The desk `overlay` part is a stacking
   * context nested (z 10010) far below the window-manager wrapper-modal that
   * hosts the workspace form / internal permission panel (--z-index-modal,
   * 100000). Trapped inside the overlay, NO z-index on our flow can lift the
   * coach above that modal, so its Back was unclickable. At document.body our
   * root escapes every desk stacking context and its own z-index competes at
   * the true document root — guiding lifts it above the modal (see skin). Event
   * routing is unaffected (uiHandler is a JS reference). Mirrors
   * rating-survey-popup's _portalToBody.
   */
  _portalToBody() {
    if (!this.el || typeof document === "undefined") return;
    if (this.el.parentElement !== document.body) {
      document.body.appendChild(this.el);
    }
  }

  _restoreHost() {
    const host = this._host;
    if (!host || !host.style) return;
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
    if (this._onPanelInvitation && typeof RADIO_BROADCAST !== "undefined") {
      RADIO_BROADCAST.off("invitation:sent", this._onPanelInvitation);
      this._onPanelInvitation = null;
    }
    if (this._onStepResize && typeof window !== "undefined") {
      window.removeEventListener("resize", this._onStepResize);
      this._onStepResize = null;
    }
    // Both unconditionally, not through their arming predicates: by the time
    // _unbind runs the flow is leaving whatever its step still says, and either
    // listener outliving the widget would act on a desk that no longer has a
    // reward flow on it.
    if (this._exitGuard) {
      this._exitGuard.stop();
    }
    this._releaseUnloadGuard();
    this._stopGuide();
    this._stopUploadGuide();
    this._clearOpenTimer();
    this._stopToastWatch();
    this._stopPanelWatch();
    this._stopTargetTrack();
    this._stopStepTargetWatch();
    this._restoreHost();
    this._watchInviteBackdrop(false);
    this._markInviteOverlay(false);
  }

  // ───────── step 1 guided walkthrough ─────────

  /** Lazily build and start the guide. `./guide` is required lazily so the
   *  orchestrator stays requirable (and unit-testable) under Node — the guide
   *  no-ops when there is no DOM. */
  /** @param {String} [pinAt] sub-step to hold until its surface is on screen —
   *  for a resume that re-opens that surface itself (see _resumeCreateForm). */
  _startGuide(pinAt) {
    // Each walkthrough run establishes its own workspace. Back → Continue
    // restarts Step 1 and the user may pick a different workspace type this
    // time, so the previous attempt's result must not carry over.
    this._resetGuideResults();
    if (!this._guide) {
      const RewardGuide = require("./guide");
      this._guide = new RewardGuide(this);
    }
    // Before start(), which reconciles once as it comes up: the pin is what
    // that first pass reads, so setting it after would be too late.
    if (pinAt) this._guide.pinAt(pinAt);
    this._guide.start();
  }

  _stopGuide() {
    if (this._guide) this._guide.stop();
  }

  /** Lazily build and start the Step 3 walkthrough. Required lazily for the
   *  same reason as the Step 1 guide: the orchestrator stays requirable under
   *  Node, and the guide no-ops when there is no DOM. */
  _startUploadGuide() {
    if (!this._uploadGuide) {
      const { RewardUploadGuide } = require("./guide-upload");
      this._uploadGuide = new RewardUploadGuide(this);
    }
    this._uploadGuide.start();
  }

  _stopUploadGuide() {
    if (this._uploadGuide) this._uploadGuide.stop();
  }

  /**
   * Close the workspace the flow opened in Step 3, as congrats appears.
   *
   * Drives the window's OWN close service rather than calling
   * Desk.onWorkspaceClosed() or clearing headlessLayer directly: window_folder
   * counts the surviving workspace tabs first and only tears the desk back down
   * to "no workspace open" (breadcrumb, sidebar tree, layer) when this was the
   * last one. A user who already had other workspaces open keeps them.
   *
   * No-ops on the legacy Step 3 path, which has no _workspace — there the user
   * uploaded from the desk topbar and nothing was opened on their behalf.
   */
  _closeStep3Workspace() {
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

  /** Give up on a workspace window that never appeared and fall back to the
   *  legacy Step 3 rather than stranding the user on a dead card. */
  _armOpenTimer() {
    this._clearOpenTimer();
    this._openTimer = setTimeout(() => {
      this._openTimer = null;
      if (this._step !== "step3_guide") return;
      if (this._uploadGuide?._sub) return; // it landed
      this._stopUploadGuide();
      // Drop the descriptor: whatever is stored no longer opens.
      this._workspace = null;
      runDel(KEY_WORKSPACE);
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
  _clearWrapperModal() {
    if (typeof Wm === "undefined" || !Wm.__wrapperModal) return;
    Wm.__wrapperModal.clear();
    if (Wm.__wrapperModal.el?.dataset) {
      Wm.__wrapperModal.el.dataset.state = "closed";
      delete Wm.__wrapperModal.el.dataset.rewardOverlay;
    }
  }

  /** Open/close the topbar Add-new dropdown (the desk owns the `addmenu` part). */
  setAddMenu(open) {
    this.triggerHandlers({ service: "reward-set-add-menu", open: !!open });
  }

  /** Expand/collapse the create flyout inside the merged topbar New menu. */
  setNewCreateMenu(open) {
    this.triggerHandlers({
      service: "reward-set-new-create-menu",
      open: !!open,
    });
  }

  /**
   * Paint the spotlight cutout over `rect` (a viewport-space DOMRect) and feed
   * the coach tooltip. Called by a guide as it walks the live desk chrome.
   *
   * @param {DOMRect} rect
   * @param {{text: string, showBack?: boolean, showNext?: boolean,
   *          nextDisabled?: boolean, above?: boolean, radius?: string}} opt
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
      // guide-scrim's clip-path hole collapses with it so every click is caught.
      // For a sub-step that only asks the user to read: cutting the surface out
      // would leave it fully lit — and when that surface is a workspace window
      // filling the screen, nothing would be dimmed at all.
      this.el.style.setProperty("--cut-x", "50vw");
      this.el.style.setProperty("--cut-y", "50vh");
      this.el.style.setProperty("--cut-w", "0px");
      this.el.style.setProperty("--cut-h", "0px");
      this.el.style.setProperty("--cut-radius", "0px");
    } else {
      // Rectangular cutout: clear the target's rect and dim only the rest — no
      // highlight ring. The box-shadow cutout does the dimming (see skin
      // __cutout). It matches the target's box and rounding EXACTLY: padding it
      // out would leak an undimmed ring of background around the target, and a
      // mismatched radius would show bright corners.
      this.el.style.setProperty("--cut-x", `${rect.left}px`);
      this.el.style.setProperty("--cut-y", `${rect.top}px`);
      this.el.style.setProperty("--cut-w", `${rect.width}px`);
      this.el.style.setProperty("--cut-h", `${rect.height}px`);
      this.el.style.setProperty("--cut-radius", radius || "4px");
    }
    // No text → cutout only, no coach. Used when the spotlighted surface already
    // carries its own message and dismiss button (the invite-sent confirmation),
    // where a coach beneath it would just repeat it as a second stray card.
    if (!text) return this.clearSpotlight();
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
          // This flow's own routing — the shared coach takes no default, so a
          // click can never land on another widget's services.
          backService: "reward-back",
          nextService: "reward-guide-next",
          // REWARD_FLOW_NEXT is translated in languages where the generic
          // LOCALE.NEXT is still at its English value, so it is passed rather
          // than left to the shared default.
          nextLabel: LOCALE.REWARD_FLOW_NEXT,
        }),
      );
    });
  }

  /** Remove the coach callout. feed(null) does NOT empty a part — prepareData
   *  wraps null into [null], so the coach would be left on screen. Reset the
   *  collection instead (same rationale as _closeDropGuard). */
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

  // ───────── funnel tracking ─────────

  /**
   * Report progress to SERVICE.reward.track (server-team service/private/reward).
   *
   * Fire-and-forget for every caller but one: the flow is a UI walkthrough and
   * a tracking outage must never stall it or surface an error to the user, so
   * failures are swallowed. The server advances status/step by rank, so a
   * duplicated or late post is harmless.
   *
   * The exception is "done", which is a REQUEST for one of the campaign's
   * limited slots rather than a report — _completeStep3 waits on the answer.
   * The promise is returned for it; every other caller ignores it and behaves
   * exactly as before.
   *
   * Skipped for a ?reward=1 run: that one was forced past the eligibility gate
   * for testing, and it already declines to latch reward_flow_done for the same
   * reason (see _finish). Letting it write would put team accounts in the
   * campaign funnel — and would burn a real slot on a test.
   *
   * @param {String} status "started" | "left" | "dropped" | "done" |
   *   "missed". "left" arrives here from an INTERCEPTED exit, where the page
   *   has not started leaving yet and an ordinary post still works; the
   *   uncatchable exits report it through _beaconLeft instead, because by
   *   then nothing but a keepalive request survives.
   * @param {String} [step] defaults to the current card step
   * @returns {Promise<Object|null>} the service's answer, or null when nothing
   *   was posted or the post failed
   */
  _track(status, step) {
    if (this._forced) return Promise.resolve(null);
    if (typeof SERVICE === "undefined" || !SERVICE.reward || !SERVICE.reward.track) {
      return Promise.resolve(null);
    }
    try {
      return this.postService(SERVICE.reward.track, {
        hub_id: Visitor.id,
        status,
        step: step || baseStep(this._step),
        campaign: CAMPAIGN,
      }).catch(() => null);
    } catch (e) {
      /* tracking must never break the flow */
      return Promise.resolve(null);
    }
  }

  /**
   * Report reaching a card step, once per step.
   *
   * Deduped because _goto fires for the transient states too (step2_waiting,
   * step1_guide …), which all share a base step — without this, opening the
   * invite popup and coming back would post "step2" three times over. Only the
   * card steps are reported; anything else is a decoration on one of them.
   */
  _trackStep(base) {
    if (!STEPS.includes(base)) return;
    if (this._trackedStep === base) return;
    this._trackedStep = base;
    this._track("started", base);
  }

  // ───────── leaving the page ─────────

  /**
   * Should an unreported exit be recorded right now?
   *
   * Every ACTIVE step, and nothing else. baseStep strips `_waiting` and
   * `_guide`, so the handoffs count too — being parked in the invite popup or
   * the uploader is where users most often wander off, and those are exactly
   * the runs worth catching.
   *
   * `congrats` and `soldout` fall out for free: neither survives baseStep into
   * STEPS. A user who has already won or already been turned away has no
   * abandon left to record.
   *
   * A ?reward=1 run reports nothing, matching _track — letting it write would
   * put team accounts in the campaign funnel.
   *
   * SHARES ITS STEP TEST with exit-guard's `armed()` but not its flags, and the
   * difference is deliberate. `_dropGuardOpen` disarms the GUARD, so a second
   * F5 does not replace the intent already on screen; it must not disarm the
   * REPORT, because a user who closes the tab while the card is up has still
   * left. `_finishing` is excluded from both: the flow is on its way out under
   * its own steam, and "Drop anyway" reports for itself.
   */
  _shouldReportUnload() {
    if (this._forced || this._finishing) return false;
    return STEPS.includes(baseStep(this._step));
  }

  /**
   * Arm or disarm the unload REPORT to match the current step.
   *
   * Idempotent, because it is called from both _goto and onDomRefresh and most
   * calls are no-ops: the listener is only touched when the answer changes.
   *
   * ONE EVENT, ONE JOB. `beforeunload` — the half that raises the browser's own
   * "Leave site?" dialog — belongs to exit-guard.js, which owns every signal
   * that ASKS the user something. This half only reports, on `pagehide`, and
   * the split across the two events is what makes "if they confirmed" work with
   * no state of our own: choosing Stay aborts the navigation and pagehide never
   * fires, so nothing is written. Choosing Leave lets it through and the report
   * goes out.
   *
   * Registering `beforeunload` here as well — which is what the two designs did
   * separately — would give one dialog two owners and leave the arming rules
   * for it in two places.
   */
  _syncUnloadGuard() {
    if (typeof window === "undefined") return;
    const want = this._shouldReportUnload();
    if (want === !!this._unloadBound) return;

    if (want) {
      this._onPageHide = (e) => {
        // BFCACHE IS NOT LEAVING. A page frozen for the back/forward cache
        // fires pagehide with persisted=true and may be restored intact,
        // widget and all — and on restore nothing re-posts `started`, because
        // _trackedStep still holds it. Reporting a drop here would leave the
        // row saying "gone" for a user who is about to be looking at the flow
        // again.
        if (e && e.persisted) return;
        this._beaconLeft();
      };
      window.addEventListener("pagehide", this._onPageHide);
      this._unloadBound = true;
      return;
    }

    this._releaseUnloadGuard();
  }

  /** Drop the listener. Separate from _syncUnloadGuard so _unbind can call it
   *  outright on the way out, without reasoning about the current step. */
  _releaseUnloadGuard() {
    if (typeof window === "undefined") return;
    if (this._onPageHide) {
      window.removeEventListener("pagehide", this._onPageHide);
      this._onPageHide = null;
    }
    this._unloadBound = false;
  }

  /**
   * Report the abandon on the way out, through a request the unload cannot
   * cancel (see beacon.js for why postService cannot do this).
   *
   * `left` is NOT terminal. yp.reward_claim_track ranks it below `started` and
   * reward.get_state counts it as OPEN, so this records that the user went away
   * without costing them the reward: they come back, resume from `step`, and
   * their next `started` post clears it by itself. That
   * matters most for the case this guard exists to catch — a plain refresh,
   * which is indistinguishable from a close at unload time and must not be
   * allowed to forfeit a prize the user is three clicks from claiming.
   *
   * @returns {Boolean} whether a request went out; for tests, not for callers.
   */
  _beaconLeft() {
    if (this._forced) return false;
    try {
      if (typeof SERVICE === "undefined" || !SERVICE.reward || !SERVICE.reward.track) {
        return false;
      }
      return beaconPost(SERVICE.reward.track, {
        hub_id: Visitor.id,
        status: "left",
        step: baseStep(this._step),
        campaign: CAMPAIGN,
      });
    } catch (e) {
      /* reporting must never obstruct the unload */
      return false;
    }
  }

  // ───────── skeleton accessors ─────────

  getStep() { return this._step; }

  // ───────── state ─────────

  _render() {
    this.feed(require("./skeleton")(this));
    // Here rather than in _goto, because _goto is not the only way the step
    // moves: _completeStep3 and _openSoldOut both assign this._step directly
    // and re-render (deliberately — neither "congrats" nor "soldout" may be
    // persisted as a resumable step). Arming off the render catches all three,
    // so reaching a terminal screen always lifts the guard and nobody is
    // prompted with "Leave site?" on their way out of a flow they finished.
    this._syncUnloadGuard();
    this._positionStepTarget();
  }

  /**
   * Steps 2 and 3 point at a real topbar control (Upload / Invite). Measure it,
   * lay the cutout over it so it reads clear while the rest stays dimmed, and
   * anchor the card just beneath it. Replaces the old fixed-position card and
   * connector arrow, which only lined up by luck.
   *
   * Deferred a frame so the freshly-fed skeleton is in the DOM, and re-run on
   * resize since the topbar reflows.
   */
  _positionStepTarget() {
    if (typeof document === "undefined" || typeof requestAnimationFrame !== "function") return;
    this._trackStepTarget();
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
   * measured before that lands on whatever has since slid into its place, which
   * is how Step 2 ended up cutting out the topbar's Upload button.
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
   * on the one frame we looked, which left half the panel dimmed and a bright
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
   * Cheap either way — one getBoundingClientRect per frame on one element,
   * bounded, and only while a step is still resolving where its hole goes.
   */
  _trackStepTarget() {
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
   * @param {DOMRect} rect the popup's own box
   * @returns {{left, top, right, bottom, width, height}} the box to cut
   */
  _unionOverflow(rect) {
    if (typeof document === "undefined" || !document.querySelectorAll) return rect;
    let out = rect;
    for (const el of document.querySelectorAll(POPUP_OVERFLOW)) {
      // They exist in the DOM closed, merely `visibility: hidden` — which still
      // measures — so ask whether they are really on screen.
      if (!onScreen(el)) continue;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) continue;
      const left = Math.min(out.left, r.left);
      const top = Math.min(out.top, r.top);
      const right = Math.max(out.right, r.right);
      const bottom = Math.max(out.bottom, r.bottom);
      out = { left, top, right, bottom, width: right - left, height: bottom - top };
    }
    return out;
  }

  /**
   * @returns {Boolean} false while a target this step EXPECTS is not on screen,
   *   so _trackStepTarget knows to keep waiting for it. True once the hole is
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

    // WHERE THE HOLE GOES. On a waiting Step 2 it is the surface the user was
    // handed to — the invite popup, or the permission panel — and NOT the
    // topbar control that opened it: that control is behind a modal by then, so
    // a hole over it lights up a corner of the topbar for no reason while the
    // surface the user is actually working sits in the dim. Both are given as a
    // surface PAIR, because a successful send replaces either with its
    // confirmation and querySelector then returns whichever is really there —
    // so the hole follows the surface instead of staying on a rect that has
    // gone. Every other step spotlights its own topbar control.
    //
    // Cutting the surface out is also what makes the dim uniform: the shadow
    // around the hole is painted by our root, which is portaled to
    // document.body and lifted clear of the wrapper-modal, so it covers the
    // topbar and sidebar too — neither of which the modal's own backdrop
    // reaches, it being confined to the desk's wm-container.
    // A step that hangs its card off no topbar control also spotlights no
    // topbar control: the panel Step 2, whose surface is handled above, and a
    // Step 3 that will guide the user inside the workspace rather than at the
    // desk topbar. Both are centred by the stylesheet (see skin __anchor).
    const notarget = onPanel || (base === "step3" && !!this._workspace);
    const spot = base === "step2" && waiting
      ? (onPanel ? PANEL_SURFACES : POPUP_SURFACES)
      : (notarget ? null : STEP_TARGET[base]);

    // WHERE THE CARD HANGS. A waiting Step 2 keeps its card under the control it
    // came from even though the hole has moved away — the card must not jump the
    // moment the popup opens.
    const anchor = this.el.querySelector(`.${this.fig.family}__anchor`);
    if (notarget && anchor?.style) {
      // Centred by the stylesheet. Clear any inline placement left over from a
      // step that had a topbar target, otherwise a reused anchor element keeps
      // the card pinned under the Upload/Invite button.
      anchor.style.left = "";
      anchor.style.top = "";
      anchor.style.right = "";
      anchor.style.transform = "";
    }

    const spotEl = spot ? document.querySelector(spot) : null;
    const rect = spotEl?.getBoundingClientRect ? spotEl.getBoundingClientRect() : null;
    let found = !spot;   // nothing expected → nothing to wait for
    if (rect && rect.width && rect.height) {
      found = true;
      // On the popup route the hole grows to take in whichever of its dropdowns
      // is open, which hang outside its box.
      const box = base === "step2" && waiting && !onPanel
        ? this._unionOverflow(rect)
        : rect;
      // Cutout hugs the target exactly, mirroring its own rounding.
      const radius =
        (typeof getComputedStyle === "function" && getComputedStyle(spotEl).borderRadius) || "";
      this.el.style.setProperty("--cut-x", `${box.left}px`);
      this.el.style.setProperty("--cut-y", `${box.top}px`);
      this.el.style.setProperty("--cut-w", `${box.width}px`);
      this.el.style.setProperty("--cut-h", `${box.height}px`);
      this.el.style.setProperty("--cut-radius", radius || "8px");
    } else if (spot) {
      // Expected a surface and it is not on screen yet (the popup opens a tick
      // after the click). Collapse the hole rather than leaving the last one
      // behind — that stale hole would be the topbar control we just moved off.
      // A zero-size cutout still spreads its 100vmax shadow over the whole
      // viewport, so the dim simply stays whole (same trick as spotlight's
      // `hole: false`).
      this.el.style.setProperty("--cut-x", "50vw");
      this.el.style.setProperty("--cut-y", "50vh");
      this.el.style.setProperty("--cut-w", "0px");
      this.el.style.setProperty("--cut-h", "0px");
      this.el.style.setProperty("--cut-radius", "0px");
    }

    // Centred states have no card placement to do.
    if (notarget || !anchor?.style) return found;
    // The card hangs under its topbar control — measured separately from the
    // hole above, which on a waiting Step 2 is somewhere else entirely.
    const ctrl = STEP_TARGET[base] && document.querySelector(STEP_TARGET[base]);
    const cr = ctrl?.getBoundingClientRect ? ctrl.getBoundingClientRect() : null;
    if (!cr || !cr.width || !cr.height) return found;
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
    return found;
  }

  /** Move to `step`, report it and re-render. The step is persisted SERVER-side
   *  by _trackStep below (reward_claim.step), which is also where a resume on
   *  another device reads it from — nothing about the position is kept locally. */
  _goto(step) {
    this._step = step;
    this._trackStep(baseStep(step));
    // While a real Step 2 surface is open (step2_waiting), take the default
    // frosted glass off its wrapper-modal and guard the backdrop against a
    // stray click abandoning the flow.
    //
    // "bare" for both routes: our own cutout is dimming the whole viewport
    // around the surface, and a second layer of the same colour on top of the
    // part of the screen that modal happens to cover is exactly what made the
    // desk read darker than the topbar and sidebar beside it.
    this._markInviteOverlay(step === "step2_waiting" && "bare");
    this._watchInviteBackdrop(step === "step2_waiting");
    this._render();
  }

  /**
   * Mark the shared wrapper-modal that hosts a Step 2 surface so its backdrop
   * follows the flow instead of the app's glass overlay (see skin). Scoped to
   * the reward flow — the topbar Invite button, which shares _openInvitePopup,
   * is left with the default look.
   *
   * @param {String|false} mode "1" for the flow's flat dim, "bare" when the
   *   flow root is already painting the dim itself, false to unmark.
   */
  _markInviteOverlay(mode) {
    if (typeof Wm === "undefined" || !Wm.__wrapperModal || !Wm.__wrapperModal.el) {
      return;
    }
    const ds = Wm.__wrapperModal.el.dataset;
    if (mode) ds.rewardOverlay = mode === true ? "1" : mode;
    else delete ds.rewardOverlay;
  }

  /**
   * Guard the dimmed area around the invite popup (step2_waiting).
   *
   * Every other surface of the flow already asks "Don't drop now" before it is
   * abandoned — the vignette on an active step, __guide-scrim during the
   * walkthrough. This sub-step had nothing: our own vignette is transparent and
   * click-through so the user can operate the popup, and the wrapper-modal
   * hosting it carries no click service, so clicking beside the popup did
   * nothing at all.
   *
   * A listener on the HOST rather than a scrim of our own: the popup owns that
   * wrapper-modal at z 100000, so anything we rendered would have to be lifted
   * above it AND punched with a hole tracking the popup's rect (the --cut-*
   * dance Step 1 does). Asking `closest` whether the click landed in the popup
   * is exact by construction and measures nothing.
   *
   * Capture phase, so the guard lands before any handler inside the
   * wrapper-modal gets to act on the same click.
   */
  _watchInviteBackdrop(on) {
    const host =
      (typeof Wm !== "undefined" && Wm.__wrapperModal?.el) || null;
    if (on) {
      if (this._onInviteBackdrop || !host) return;
      this._inviteBackdropHost = host;
      this._onInviteBackdrop = (e) => {
        // The guard once it is up (it renders in our own root, but a click that
        // started there must never re-open it).
        if (this._dropGuardOpen) return;
        // Nothing of ours on screen — the popup has gone and no confirmation
        // took its place, so this host is showing somebody else's business and
        // there is nothing here to abandon.
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
        // click on it arrives HERE instead, so the Back the user is looking at
        // does nothing and the abandon guard answers for it. Route the click by
        // geometry to the control they aimed at.
        const onCard = this._cardHit(e);
        if (onCard) {
          e.stopPropagation();
          if (onCard === "back") this.onUiEvent({}, { service: "reward-back" });
          return;
        }
        e.stopPropagation();
        this._openDropGuard();
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

  _isWaiting() { return isWaiting(this._step); }

  /**
   * Where a backdrop click landed relative to the step card, by geometry.
   *
   * The card is ours and is on screen; a click inside it is never an abandon
   * gesture, whichever layer actually received the event. Used only by the
   * backdrop guard, to keep a covered card operable — see _watchInviteBackdrop.
   *
   * @returns {"back"|"card"|null} "back" for the Back button, "card" elsewhere
   *   on the card, null when the click missed it (the real backdrop).
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
    return inside(`.${pfx}__btn--ghost`) ? "back" : "card";
  }

  // ───────── external completion signals ─────────

  /**
   * A workspace was created (form-folder → the RADIO_BROADCAST
   * "workspace:refresh" this subscribes to). Only meaningful while guiding.
   *   - Personal (payload.personal): a folder, no follow-up panel → finish now.
   *   - Internal/External: a permission panel opens next; hand off to the guide
   *     to spotlight it and finish when the user closes it (onGuideComplete).
   */
  onWorkspaceCreated(payload) {
    if (this._step !== "step1_guide") return;
    // Remember it for Step 3, which reopens this exact workspace. media_form
    // sends the descriptor on both creation paths; a payload without one just
    // leaves Step 3 on its legacy variant.
    const ws = readDescriptor(payload?.workspace);
    if (ws) {
      this._workspace = ws;
      runSet(KEY_WORKSPACE, JSON.stringify(ws));
    }
    if (payload?.personal) {
      this._stopGuide();
      this._goto("step2");
      return;
    }
    // The area picks the guide's safety budget for the follow-up surface. Both
    // areas now open the same lazily imported panel by the same route, so the
    // split is headroom rather than two arrival paths — see the note on the
    // constants in guide.js. Passed even when the descriptor was unusable
    // (undefined → the guide waits the long budget).
    if (this._guide) this._guide.onWorkspaceCreated(ws?.area);
    else this.onGuideComplete();
  }

  /**
   * The walkthrough reached the members permission panel — the surface that
   * invites members. That IS what Step 2 asks for, so the flow enters Step 2 on
   * it rather than trailing Step 1 and then asking for the same thing again on
   * a card.
   *
   * Step 1 ENDS here: the walkthrough is stopped and the Step 2 card takes the
   * coach's place. Running the two side by side was the alternative and it does
   * not work — the guide and the card both drive the --cut-* vars and both
   * claim the overlay, and a walkthrough state renders no card at all, which is
   * why counting the panel as Step 2 showed nothing on screen.
   *
   * BOTH hub branches reach this now. External (share) creation used to open a
   * share dock instead — not an invite panel — so it stayed inside Step 1 and
   * landed on the Step 2 card with its Invite button. media_form now ends
   * internal and external creation on the same permission_restricted panel, so
   * external takes this handoff too. Personal is still not this: it is a folder
   * with no follow-up panel and finishes at Step 2 directly.
   */
  onInvitePanel() {
    if (this._step !== "step1_guide") return;
    this._invitePanelOpen = true;
    this._inviteSent = false;
    // Stop the walkthrough BEFORE re-rendering: stop() clears the coach through
    // the `guide-callout` part, which the card layout below does not have.
    this._stopGuide();
    // The panel is a real surface the user now operates, which is exactly what
    // step2_waiting means. It brings the whole handoff treatment with it: card
    // visible with the step-2 progress, our own vignette off so the panel is
    // reachable, the wrapper-modal tinted to the flow's dim, and a click beside
    // the panel guarded by "Don't drop now" (_watchInviteBackdrop, both armed
    // by _goto).
    this._goto("step2_waiting");
    this._awaitPanelClosed();
  }

  /**
   * Hold Step 2 while the user works the permission panel, and act on what they
   * do with it. Nothing reports this panel to us — the desk reports the invite
   * popup for itself (onInvitePopupClosed) but not this — so observe it, the
   * same way _awaitToastDismissed watches for a confirmation to be dismissed.
   *
   * Two outcomes, decided by whether an invitation was actually sent:
   *   sent    → Step 2 is done; the confirmation that REPLACED the panel is
   *             dismissed and the flow moves to Step 3.
   *   closed  → the panel's own X is a Back, and Back from here means the
   *             sub-step BEFORE it: Step 1's create-workspace form, re-opened
   *             for the user (_resumeCreateForm). Exactly what the card's own
   *             Back does (see reward-back).
   *
   * The success signal is permission_restricted's "invitation:sent" broadcast,
   * not the presence of a confirmation: a FAILED invite raises a window_info
   * of its own (Wm.alert on the error path), so sniffing for one would read a
   * failure as a completed step.
   *
   * Watches the DOCUMENT, not the wrapper-modal the panel happens to be in
   * today: pinning the host would make a panel opened anywhere else either
   * hang the step forever (no mutations on the watched host) or end it on the
   * first unrelated one. The guides observe document.body for the same reason.
   *
   * Armed from two places, and only one of them has the panel on screen
   * already: Step 1's walkthrough hands over with it up, while the rewind from
   * Step 3 has just asked for it and its kind is lazily imported. So absence is
   * only read as a close once the panel has actually been SEEN — otherwise the
   * second caller would advance on the frame it armed, reading "not yet" as
   * "already closed". A panel that never turns up falls back to the Step 2 card
   * rather than waiting for good.
   */
  _awaitPanelClosed() {
    const advance = () => {
      this._stopPanelWatch();
      const sent = this._inviteSent;
      this._invitePanelOpen = false;
      this._inviteSent = false;
      this._markInviteToast(false);
      // Deferred a microtask for the same reason as _awaitToastDismissed: the
      // observer fires DURING the panel's removal unwind, so let that settle
      // before rendering the next step over the same host — which the rewind
      // below feeds the create form straight back into.
      Promise.resolve().then(() => {
        if (this.isDestroyed?.()) return;
        if (sent) return this._goto("step3");
        this._resumeCreateForm();
      });
    };
    // The panel was asked for but never arrived (its chunk failed, say). Land on
    // the Step 2 card instead of waiting on it for good — and NOT through
    // advance(), whose "nothing was sent" branch would rewind all the way to
    // Step 1's create form over a panel the user never even saw.
    const giveUpOnPanel = () => {
      this._stopPanelWatch();
      this._invitePanelOpen = false;
      this._inviteSent = false;
      this._markInviteToast(false);
      Promise.resolve().then(() => {
        if (this.isDestroyed?.()) return;
        this._goto("step2");
      });
    };
    const onScreen = () =>
      typeof document !== "undefined" && !!document.querySelector(PANEL_SURFACES);
    if (typeof MutationObserver === "undefined") {
      // Nothing to watch with → don't strand the user on a step that can then
      // never end.
      return advance();
    }
    let seen = onScreen();
    this._panelObs = new MutationObserver(() => {
      if (!onScreen()) return seen ? advance() : undefined;
      seen = true;
      // The panel gone with something still up means the invite-sent
      // confirmation has replaced it — step aside for it.
      this._markInviteToast(!document.querySelector(INVITE_PANEL));
      // Still there — keep the hole on it. TRACK rather than measure once: this
      // fires when the panel is inserted, which is before it has slid into
      // place, and again when the confirmation replaces it. Both arrive
      // animating. Safe against feedback: the cutout is driven through inline
      // CSS vars and this watches childList only, not attributes.
      this._trackStepTarget();
    });
    this._panelObs.observe(document.body, { childList: true, subtree: true });
    if (!seen) {
      this._panelOpenTimer = setTimeout(giveUpOnPanel, PANEL_OPEN_TIMEOUT_MS);
    }
  }

  _stopPanelWatch() {
    if (this._panelObs) {
      this._panelObs.disconnect();
      this._panelObs = null;
    }
    if (this._panelOpenTimer) {
      clearTimeout(this._panelOpenTimer);
      this._panelOpenTimer = null;
    }
  }

  /**
   * Put Step 2 back on the permission panel of the workspace this run created.
   *
   * Reached by stepping back out of Step 3. For a workspace made through either
   * HUB branch, Step 2 was never the desk's Invite button — it was that
   * workspace's own members panel — so going back to a card pointing at the
   * topbar would send the user somewhere they have never been. Reopen the panel
   * instead, on the same workspace, and let Step 2 resume exactly where it was.
   *
   * The panel takes a hub_id and nothing else it cannot do without (its media is
   * optional), so the descriptor this run has been carrying since Step 1 is
   * enough to bring it back.
   *
   * Both hub areas qualify: media_form's FLOW map now ends internal AND external
   * creation on the same permission_restricted panel, so external reached Step 2
   * the same way internal did and has the same place to go back to.
   *
   * Whitelisted rather than "anything but personal": onWorkspaceCreated stores
   * the descriptor BEFORE its personal branch, so this._workspace is set for a
   * personal workspace too — and that one is a home-root folder with no hub and
   * no panel to reopen. Naming the two real hub areas keeps an unrecognised area
   * out as well.
   *
   * @returns {Boolean} false when this run has no hub workspace to go back to —
   *   a personal one, or a reload that lost the descriptor — leaving the plain
   *   Step 2 card in charge.
   */
  _reopenInvitePanel() {
    const ws = this._workspace;
    if (!ws || !["private", "share"].includes(String(ws.area))) return false;
    if (typeof Wm === "undefined" || typeof Wm.__wrapperModal?.feed !== "function") {
      return false;
    }
    // Same shape media_form feeds on the create path: a view wrapping the hub
    // row, which the panel copies its properties from. Optional — the panel
    // fetches its members from hub_id alone — so a missing Backbone is not fatal.
    const media = typeof Backbone !== "undefined"
      ? new Backbone.View({ model: new Backbone.Model({ ...ws }) })
      : null;
    Wm.__wrapperModal.feed({
      kind: "permission_restricted",
      hub_id: ws.hub_id,
      ...(media ? { media } : {}),
      source: this,
      persistence: _a.once,
    });
    if (Wm.__wrapperModal.el?.dataset) {
      Wm.__wrapperModal.el.dataset.state = "open";
    }
    this._invitePanelOpen = true;
    this._inviteSent = false;
    this._goto("step2_waiting");
    // Its kind is lazily imported, so it is not in the DOM yet — the watcher
    // waits for it before treating its absence as a close (see _awaitPanelClosed).
    this._awaitPanelClosed();
    return true;
  }

  /**
   * Rewind from the permission panel to the sub-step before it: Step 1's
   * create-workspace form, back on screen.
   *
   * Both ways out of the panel that are not "invitation sent" land here — its
   * own X and the card's Back — so they behave identically.
   *
   * The form is re-opened for the user rather than waiting for them to walk
   * the topbar again, through the desk's own "new-workspace" service. That
   * service does both halves of the job in one go: it clears the shared
   * wrapper-modal, taking the panel with it when it is still there (the Back
   * route), and feeds the create form into the same host.
   *
   * The guide is pinned to "form" BEFORE it starts, so the reconcile it runs
   * on startup — in the gap where the panel has gone and the form has not yet
   * mounted — cannot drop the walkthrough back to the Add-new button and flash
   * a spotlight there.
   *
   * NOTE: the workspace created before the panel opened is left behind, on the
   * server and in the sidebar. Only this run's memory of it is dropped
   * (_startGuide → _resetGuideResults), so Step 3 opens whichever workspace the
   * user creates from here.
   */
  _resumeCreateForm() {
    this._stopPanelWatch();
    this._invitePanelOpen = false;
    this._inviteSent = false;
    this._markInviteToast(false);
    this._goto("step1_guide");
    this._startGuide("form");
    this.triggerHandlers({ service: "new-workspace" });
  }

  /**
   * A member was really invited from the permission panel. Latched only while
   * that panel is serving Step 2: an invitation sent later, from the topbar or
   * a settings panel, is not this step being completed.
   *
   * This is what makes closing the panel mean two different things — Step 2
   * done, or a plain Back (see _awaitPanelClosed).
   */
  onPanelInvitation() {
    if (!this._invitePanelOpen) return;
    this._inviteSent = true;
  }

  /** True while Step 2 is being served by the permission panel rather than the
   *  invite popup. Read by the skeleton: the panel is the surface in play, so
   *  the card points at no topbar control and lifts clear of the modal. */
  invitePanelOpen() { return !!this._invitePanelOpen; }

  /** True while the invite-sent confirmation stands in the panel's place. Read
   *  by the skeleton so a re-render keeps the card hidden. */
  inviteToastOpen() { return !!this._inviteToastOpen; }

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
  _markInviteToast(on) {
    const next = !!on;
    if (this._inviteToastOpen === next) return;   // observer fires constantly
    this._inviteToastOpen = next;
    const root =
      this.el?.querySelector?.(`.${this.fig.family}__root`) || this.el;
    if (!root?.dataset) return;
    if (next) root.dataset.toast = "1";
    else delete root.dataset.toast;
  }

  /** Forget everything the Step 1 walkthrough established. It belongs to a
   *  single run: Step 3 must open the workspace THIS run created, not one an
   *  earlier, abandoned run left behind. */
  _resetGuideResults() {
    this._workspace = null;
    runDel(KEY_WORKSPACE);
  }

  /** True when Step 1 handed us a workspace to reopen. Read by the step card
   *  and the skeleton to pick the guided Step 3 over the legacy one. */
  hasStep1Workspace() { return !!this._workspace; }

  /**
   * The guide finished its perm phase (panel closed) → Step 2.
   *
   * Only the branches the walkthrough still owns reach this: personal (no panel
   * at all), and the safety timeout when no panel ever appears. Both hub types
   * leave the guide the moment their members panel appears — that panel IS
   * Step 2, and _awaitPanelClosed carries it from there (see onInvitePanel).
   */
  onGuideComplete() {
    if (this._step !== "step1_guide") return;
    this._stopGuide();
    this._goto("step2");
  }

  /**
   * A file upload completed — the LAST step. Only while step 3 is waiting.
   *
   * On the GUIDED path this is not the end: the walkthrough has two beats left,
   * spotlighting the upload in progress and then the files panel it landed in
   * (see guide-upload). Finishing here instead would tear the workspace down in
   * the same frame the first file arrived, so the user never sees the thing the
   * whole step was for. The guide's last Next comes back through
   * onUploadGuideComplete.
   *
   * The legacy path has no workspace window and no files panel to point at, so
   * it still completes on the signal.
   */
  onUploadDone() {
    if (this._step !== "step3_waiting" && this._step !== "step3_guide") return;
    if (this._step === "step3_guide" && this._uploadGuide) {
      this._uploadGuide.onUploaded();
      return;
    }
    this._completeStep3();
  }

  /** The Step 3 walkthrough's final beat was dismissed — the user has seen
   *  their files. Called by the guide's Next on the "files" sub-step. */
  onUploadGuideComplete() {
    if (this._step !== "step3_guide") return;
    this._completeStep3();
  }

  /** Claim the reward and show congrats — or the sold-out notice, when the last
   *  slot went to someone else while this user was walking through the flow.
   *  The uploader is the OS file picker plus a progress window, so nothing else
   *  is holding the shared modal host by now. */
  _completeStep3() {
    this._stopUploadGuide();
    this._clearOpenTimer();
    // The upload IS the claim — report it before any of the teardown below, so
    // a failure while closing the workspace still leaves the funnel correct.
    //
    // This one post is AWAITED, alone among the flow's tracking calls, because
    // it is not a report: the campaign has a fixed number of slots and the
    // server decides whether this user got one. Only it can — two people
    // finishing together would both count 99 in their own browser.
    const claim = this._track("done", "step3");
    // The reward is claimed, so hand the desk back at Home rather than leaving
    // the user to dismiss a workspace the flow walked them into. Done straight
    // away rather than after the answer: the workspace has to close either way,
    // and leaving it open for a round trip would show the user a desk mid-
    // teardown.
    this._closeStep3Workspace();
    claim.then((res) => {
      if (this.isDestroyed?.()) return;
      // No answer means no evidence, and the likeliest truth is that they won:
      // the gate turned capped users away before Step 1, so a user who reached
      // Step 3 was inside the cap when they started. Refusing on silence would
      // take the reward off someone for OUR outage. If the post never landed
      // the row is still 'started', so a later visit finds them capped at the
      // gate and tells them then. A ?reward=1 run lands here too — it posts
      // nothing, and a tester must still see congrats.
      if (res && res.granted === 0) return this._openSoldOut();
      this._step = "congrats";
      // Re-render BEFORE opening the modal. stop() only clears the coach; the
      // cutout and the full-viewport __guide-scrim stay in the markup, and a
      // guiding root outranks the wrapper-modal that hosts congrats — leaving
      // them would grey the confirmation out and eat its button. Deliberately
      // not _goto: "congrats" must not be persisted as a resumable step.
      this._render();
      // "bare": the re-render above leaves a full-viewport vignette behind the
      // modal, so the wrapper-modal must not stack a second dim on top of it.
      if (!this._openModal(congratsModal(this), "bare")) this._finish();
    });
  }

  /**
   * Show the sold-out notice and stop.
   *
   * Both routes end here — the gate's capped verdict, which mounts straight
   * into it, and a completion the server refused. It is congrats' twin in every
   * mechanical respect (terminal step, same re-render-then-"bare"-modal dance,
   * same fallback when there is no modal host), because it is the same kind of
   * screen: the last thing the flow says before it leaves.
   */
  _openSoldOut() {
    // A capped mount has already rendered this exact root — initialize set the
    // step and onDomRefresh drew it — so only the step-3 route needs the
    // re-render, and feeding an identical tree twice would just flicker.
    if (this._step !== "soldout") {
      this._step = "soldout";
      this._render();
    }
    if (!this._openModal(soldOutModal(this), "bare")) this._dismissSoldOut();
  }

  /**
   * The user acknowledged the notice — write the terminal 'missed' and go.
   *
   * This is what stops the screen coming back on every login: 'missed' is not
   * in the set that opens the flow, so the next reward.get_state answers no.
   * Posted on DISMISSAL rather than on display so a user who never saw it —
   * closed the tab, no modal host — is still eligible to be told next time.
   */
  _dismissSoldOut() {
    this._track("missed");
    this._finish();
  }

  /** An invitation was sent successfully. The invite popup closes right after
   *  this, so we only LATCH the success here and let onInvitePopupClosed drive
   *  the advance to step 3. */
  onInvitationSent() {
    if (this._step !== "step2_waiting") return;
    this._inviteSucceeded = true;
    // The backdrop guard stays armed across the handover to the confirmation:
    // Step 2 is not finished until that card is closed, which is what advances
    // to Step 3 (see onInvitePopupClosed → _awaitToastDismissed). Step 1's perm
    // phase reads the same way — its scrim keeps guarding while the window_info
    // is spotlighted, and closing it completes the step.
  }

  /** The invite popup closed. Two cases:
   *  - it closed because the send succeeded → advance to step 3 (upload);
   *  - it closed without sending → re-arm step 2 so the user can retry. */
  onInvitePopupClosed() {
    // We are the ones closing it, on the way out (see _finish).
    if (this._finishing) return;
    if (this._inviteSucceeded) {
      this._inviteSucceeded = false;
      // The success toast (invite-popup's Wm.alert notice) is about to take the
      // shared wrapper-modal's place. Keep the flow's backdrop tint on for it
      // and HOLD: step 3 only takes over once the user dismisses that toast
      // (X / Close), so the confirmation isn't buried under the step card's own
      // vignette the instant it appears.
      this._awaitToastDismissed(() => {
        this._markInviteOverlay(false);
        this._goto("step3");
      });
      return;
    }
    // Closed without sending — drop the tint and re-arm step 2 to retry.
    this._markInviteOverlay(false);
    if (this._step !== "step2_waiting") return;
    this._goto("step2");
  }

  /** Watch the shared wrapper-modal for the invite-sent toast to appear and
   *  then be dismissed by the user, and only then run `done`. The toast is fed
   *  asynchronously by invite-popup's Wm.alert AFTER this runs, so we wait for
   *  it to show (seen) before treating its absence as "closed". */
  _awaitToastDismissed(done) {
    const advance = () => {
      this._markInviteToast(false);
      // The observer fires DURING the toast's removal unwind; defer a microtask
      // so that collection reset settles before we touch the same host.
      Promise.resolve().then(() => {
        if (this.isDestroyed?.()) return;
        done();
      });
    };
    const host =
      (typeof Wm !== "undefined" && Wm.__wrapperModal?.el) ||
      null;
    if (!host || typeof MutationObserver === "undefined") {
      return advance(); // nothing to watch → don't strand the flow
    }
    const TOAST = INVITE_TOAST;
    let seen = false;
    const check = () => {
      if (host.querySelector(TOAST)) {
        if (!seen) {
          // The confirmation has taken the popup's place in this host. Treat it
          // exactly as the panel route treats its own: step the card aside (it
          // restates a step just completed, and leaves a stray Back beside a
          // card that has its own Close), and move the hole onto it — the popup
          // it replaced is gone, so a hole left on that rect lights up empty
          // space and dims the confirmation itself.
          this._markInviteToast(true);
          this._trackStepTarget();
        }
        seen = true;
        return;
      }
      // The toast has appeared and is now gone → the user closed it → advance.
      if (seen) {
        this._stopToastWatch();
        advance();
      }
    };
    this._toastObs = new MutationObserver(check);
    this._toastObs.observe(host, { childList: true, subtree: true });
    // Fallback: if the toast never shows (Wm.alert failed / kind not loaded),
    // don't strand the user on step 2 — advance after a short grace.
    this._toastTimer = setTimeout(() => {
      if (!seen) {
        this._stopToastWatch();
        advance();
      }
    }, 4000);
    check(); // the toast may already be present
  }

  _stopToastWatch() {
    if (this._toastObs) {
      this._toastObs.disconnect();
      this._toastObs = null;
    }
    if (this._toastTimer) {
      clearTimeout(this._toastTimer);
      this._toastTimer = null;
    }
  }

  // ───────── leaving the page ─────────

  /**
   * Is the flow in a state worth guarding? Read by the exit guard before it
   * acts on ANY of its signals (see exit-guard.js).
   *
   * The decision itself is the pure `armed` there, so it can be exercised
   * without a browser; this only supplies the state it reads.
   */
  exitArmed() {
    if (this.isDestroyed?.()) return false;
    return exitArmed(this._step, {
      finishing: this._finishing,
      guardOpen: this._dropGuardOpen,
    });
  }

  /**
   * The user made a move that would take the page away from the flow — a
   * refresh keystroke or the Back button. The guard has already stopped it
   * happening; this is where the flow decides what to say about it.
   *
   * Same card as every other abandon gesture, deliberately: "Don't drop now"
   * asks the same question whether it was raised by a click on the vignette or
   * by F5, and a second variant would be one more string to translate for no
   * new information.
   *
   * The intent is REMEMBERED so "Drop anyway" can carry it out rather than
   * discarding it and making the user ask twice.
   *
   * @param {{kind: "reload"|"navigate"}} intent
   */
  onExitIntent(intent) {
    if (!this.exitArmed()) return;
    this._pendingExit = intent || null;
    this._openDropGuard();
  }

  /**
   * Do the thing the user originally asked for, once the flow has finished
   * getting out of its way.
   *
   * Called after _finish, never before: a reload that fired first would take
   * the page with it while the status post was still in flight and the
   * handed-off surfaces were still open.
   */
  _resumeExit(exit) {
    if (!exit || typeof window === "undefined") return;
    try {
      if (exit.kind === "reload") return location.reload();
      if (exit.kind === "navigate") return this._exitGuard?.resumeNavigate();
    } catch (e) {
      /* the flow is already gone; a failed exit just leaves the user here */
    }
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
    // app's frosted-glass blur, so these modals read as part of the same
    // overlay as the vignette/spotlight (same marker Step 2 uses for the invite
    // popup — see _markInviteOverlay).
    //
    // "bare" when the flow root is ALREADY painting a full-viewport vignette
    // behind the modal (congrats): the glass still has to go, but a second dim
    // of the same colour would just double the darkness. See the skin.
    Wm.__wrapperModal.el.dataset.rewardOverlay = overlay;
    this._modalOpen = true;
    return true;
  }

  _closeModal() {
    if (!this._modalOpen) return;
    if (typeof Wm !== "undefined" && Wm.__wrapperModal) {
      Wm.__wrapperModal.clear();
      Wm.__wrapperModal.el.dataset.state = "closed";
      delete Wm.__wrapperModal.el.dataset.overlay;
      delete Wm.__wrapperModal.el.dataset.rewardOverlay;
    }
    this._modalOpen = false;
  }

  /**
   * Open the "Don't drop now" modal into the flow's OWN `drop-modal` part
   * rather than Wm.__wrapperModal, for the two states where something else
   * already occupies that wrapper-modal:
   *   - the Step 1 walkthrough (guided create-form / permission panel),
   *   - step2_waiting (the invite popup) — feeding the wrapper-modal there
   *     would replace the popup and discard the emails the user typed, which is
   *     precisely what a "Continue" has to preserve.
   * Either way "Continue" just closes this and what was underneath resumes
   * untouched.
   *
   * The root sits below the wrapper-modal (z 10020 vs 100000), so lift it while
   * the guard is up or the modal paints UNDER the very surface it is guarding.
   * Set imperatively, like the --cut-* vars: raising the guard must not
   * re-render the flow.
   */
  _openDropGuard() {
    this._dropGuardOpen = true;
    this._markRootDrop(true, { lift: true });
    this.ensurePart("drop-modal").then((p) => {
      if (!p) return;
      // Feed first, then flag open — the modal opts its own pointer events back
      // in (see skin __modal), so it stays clickable regardless; data-open only
      // drives the host's backdrop dim, and setting it after feed keeps a
      // re-render from wiping it.
      p.feed(dropModal(this));
      if (p.el?.dataset) p.el.dataset.open = "1";
    });
  }

  _closeDropGuard() {
    this._dropGuardOpen = false;
    this._markRootDrop(false);
    this.ensurePart("drop-modal").then((p) => {
      if (!p) return;
      // feed(null) does NOT empty a part: prepareData wraps null into [null], so
      // the modal is left in place. Reset the collection to actually remove it.
      if (typeof p.collection?.reset === "function") {
        p.collection.reset();
      } else if (typeof p.feed === "function") {
        p.feed(null);
      }
      if (p.el?.dataset) delete p.el.dataset.open;
    });
  }

  /**
   * Flag the flow ROOT while a "Don't drop now" guard is up.
   *
   * `data-drop` turns the flow's own dim off, because the guard's backdrop is
   * now supplying one and two of them are not one colour (see the skin). Both
   * guards set it — the one in our own root and the one fed into the
   * wrapper-modal.
   *
   * `lift` additionally raises the root, and ONLY the in-root guard asks for it:
   * that guard renders inside our stacking context, so it cannot climb over the
   * wrapper-modal it is guarding on its own. The other guard IS in that
   * wrapper-modal, so lifting the root there would put the flow's own card over
   * the modal asking about it.
   *
   * The skeleton's root box is fed as a child of our element; falling back to
   * the element itself keeps this working if it is ever the root, since the
   * rules match on the class either way.
   */
  _markRootDrop(on, { lift = false } = {}) {
    const root =
      this.el?.querySelector?.(`.${this.fig.family}__root`) || this.el;
    if (!root?.dataset) return;
    if (on) {
      root.dataset.drop = "1";
      if (lift) root.dataset.dropLift = "1";
      return;
    }
    delete root.dataset.drop;
    delete root.dataset.dropLift;
  }

  /**
   * Final exit — from "Drop anyway", "Go to dashboard", or the sold-out
   * notice's dismiss. Never shown again, "Never again" is now the SERVER's
   * record, not a local latch: the terminal status written by _track (done /
   * dropped / missed) is what makes the next reward.get_state answer no. A ?reward=1 run reports nothing at all (see
   * _track), so it still cannot mask a real campaign arrival for the tester.
   *
   * Only the two mid-run scratch keys are cleared here — they describe THIS
   * walkthrough and mean nothing once it ends.
   */
  _finish() {
    // Latched BEFORE the surfaces below are cleared: clearing the invite popup
    // fires the desk's destroy hook, which calls straight back into
    // onInvitePopupClosed — and that would read step2_waiting and
    // _goto("step2"), re-rendering a flow that is on its way out.
    this._finishing = true;
    runDel(KEY_WORKSPACE);
    this._closeModal();
    // Stop the walkthrough BEFORE tearing its surfaces down: its observer would
    // otherwise read the permission panel vanishing as the user having closed
    // it, and "complete" Step 1 on a flow that is already leaving.
    this._unbind();
    this._closeHandoffSurfaces();
    this.softDestroy();
  }

  /**
   * Take down the surfaces the flow HANDED THE USER TO, on the way out.
   *
   * Reached from "Drop anyway". None of them is ours — they are other widgets,
   * opened because the walkthrough walked the user into them — but that is
   * exactly why they cannot be left behind: they strand on a desk whose flow no
   * longer exists, with nothing left to close them. For the wrapper-modal it is
   * worse than untidy. Clearing its content without closing it, or leaving it
   * open with content nobody owns, both leave a full-viewport host over the
   * desk; emptied and still `data-state="open"` it is an invisible blocker.
   *
   * Gated on the step, so an exit from anywhere else — congrats' own button —
   * cannot reach in and shut something the user opened for themselves.
   */
  _closeHandoffSurfaces() {
    // The workspace the flow opened for Step 3. "Drop anyway" is an exit like
    // any other, and this window is as much the flow's doing as the surfaces
    // below — the user did not open it, the card's "Open workspace" did — so
    // leaving it behind strands it on a desk whose flow no longer exists. Both
    // other ways out of Step 3 already take it with them: congrats
    // (_completeStep3) and Back (see the reward-back case).
    //
    // Scoped to Step 3, where that window is the one on screen, and a no-op on
    // the legacy path, which never opened one.
    if (baseStep(this._step) === "step3") this._closeStep3Workspace();
    const guided = this._step === "step1_guide";
    if (!guided && this._step !== "step2_waiting") return;
    // The shared wrapper-modal. At these two steps whatever sits in it is
    // there because of us: Step 1's create form or its follow-up permission
    // panel (media_form feeds `permission_restricted` into this same host), or
    // Step 2's invite popup and the confirmation that replaces it.
    this._clearWrapperModal();
    // Legacy safety net. External ("share") creation used to open the
    // secure-share dock as a real WINDOW (media_form → Wm.launch) rather than
    // into the wrapper-modal, so clearing that host did not touch it. Both hub
    // types now feed permission_restricted into the wrapper-modal, so the line
    // above already covers them and this is normally a no-op. Kept because it
    // is the only thing that would clean up such a dock if one is on screen
    // during the walkthrough — abandoning with it open would strand it.
    if (guided) this._closeSecureShare();
  }

  /**
   * Close the upload-progress window.
   *
   * Driven through the window's own close service, like _closeSecureShare and
   * _closeStep3Workspace, so it unregisters from the pool instead of just
   * leaving the DOM. Called when Step 3's walkthrough rewinds off a failed
   * upload: those failed rows are what the guide reads as "still failing", so
   * the window has to go for the rewind to land anywhere.
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

  /** Close any secure-share dock left open during the walkthrough. Step 1's
   *  create step used to launch one for external workspaces; it no longer does
   *  (both hub types end on the members panel), so this is normally a no-op.
   *  Driven through the window's own close service, like _closeStep3Workspace,
   *  so it unregisters from the pool instead of just leaving the DOM. During
   *  the walkthrough the flow owns the screen, so any such window is one the
   *  user is not meant to be left with. */
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

  // ───────── event routing ─────────

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd?.mget?.(_a.service);
    switch (service) {
      case "reward-continue":
        // step1's primary action: start the guided walkthrough that spotlights
        // the real desk chrome (New → Workspace item → the form) and lets
        // the user create the workspace themselves. onWorkspaceCreated ends it.
        // Inert if already waiting or guiding.
        if (this._isWaiting() || this._step === "step1_guide") return;
        this._goto("step1_guide");
        this._startGuide();
        return;

      case "reward-invite":
        this._goto("step2_waiting");
        // Reaches modules/desk -> _openInvitePopup().
        this.triggerHandlers({ service: "invite-member" });
        return;

      case "reward-open-workspace":
        // Guided Step 3: reopen the workspace created in Step 1 so the upload
        // lands there. loadWorkspace is the same entry point the sidebar rows
        // use; it resolves the root and mounts the workspace pane.
        if (!this._workspace) return;
        if (typeof Wm !== "undefined" && typeof Wm.loadWorkspace === "function") {
          Wm.loadWorkspace({ ...this._workspace });
        }
        this._goto("step3_guide");
        this._startUploadGuide();
        this._armOpenTimer();
        return;

      case "reward-guide-next":
        // Step 3's read-only beats carry a Next, having no real action to
        // observe: "folder" (this is your workspace) walks on to "+ New", and
        // "files" (here is what you uploaded) ends the walkthrough.
        if (this._uploadGuide) this._uploadGuide.onNext();
        return;

      case "reward-upload":
        this._goto("step3_waiting");
        // Reaches modules/desk through the uiHandler chain -> Wm.handleUpload().
        this.triggerHandlers({ service: _e.upload });
        return;

      case "reward-back": {
        // In the walkthrough, Back steps back one sub-step where it can (at the
        // form it closes the form so the guide reconciles to the Add-new
        // button). Only when there is nothing earlier does it tear the guide
        // down and return to the Step 1 card.
        if (this._step === "step1_guide") {
          if (this._guide?.back()) return;
          this._stopGuide();
          return this._goto("step1");
        }
        if (this._invitePanelOpen) {
          // Back out of the permission panel to the sub-step before it, Step 1's
          // create form. _resumeCreateForm closes the panel on the way (the
          // service it drives clears the host first), and the panel's own X
          // arrives at the same place from the other side: a close with nothing
          // sent IS this (see _awaitPanelClosed).
          return this._resumeCreateForm();
        }
        if (this._step === "step3_guide") {
          // One beat has a step-back of its own: a failed upload rewinds to the
          // "+ New" pill so the user can try again (see guide-upload's back()).
          // Everywhere else Back leaves the walkthrough for the card, workspace
          // still open.
          if (this._uploadGuide?.back()) return;
          this._stopUploadGuide();
          this._clearOpenTimer();
          return this._goto("step3");
        }
        const base = baseStep(this._step);
        if (this._isWaiting()) return this._goto(base);
        const prev = STEPS[STEPS.indexOf(base) - 1];
        if (!prev) return;
        // Stepping out of Step 3 takes the workspace with it. The flow opened
        // that window itself ("Open workspace"), and Step 2 is about inviting
        // someone from the DESK — its card anchors to the desk topbar and its
        // invite popup opens over it, both of which a workspace window covers.
        // Leaving it up also strands the user's own way back: the card they land
        // on offers "Open workspace" for a workspace already open.
        //
        // No-op on the legacy Step 3, which never opened one. The descriptor is
        // kept, so coming forward again reopens the same workspace.
        if (base === "step3") {
          this._closeStep3Workspace();
          // An internal workspace's Step 2 was its members panel, not the
          // desk's Invite button — go back to THAT (it handles its own _goto).
          if (this._reopenInvitePanel()) return;
        }
        this._goto(prev);
        return;
      }

      case "reward-vignette-click":
        // Inert while the user is being handed off to a real surface, or when a
        // drop modal is already up. A waiting step is not unguarded, though:
        // step2_waiting raises the same guard from the invite popup's own
        // backdrop (see _watchInviteBackdrop).
        if (this._isWaiting() || this._modalOpen || this._dropGuardOpen) return;
        // EVERY state raises the same guard, the one in our own root — the
        // walkthroughs, whose __guide-scrim fires this, and the card steps
        // alike. It is position:fixed and the root lifts above the desk, so its
        // dim covers the sidebar and the topbar as well as the work area. The
        // wrapper-modal's backdrop cannot: that host is absolutely positioned
        // inside the desk's wm-container, which is what left the chrome bright
        // beside a dimmed grid on the card steps.
        this._openDropGuard();
        return;

      case "reward-drop-stay":
        // The guard lives in our own root, so closing it just hands the user
        // back what was underneath: the card, the guide mid-walkthrough, or the
        // invite popup with whatever they had typed. Nothing was torn down, so
        // there is nothing to restore.
        //
        // Whatever raised the guard is cancelled with it — "Continue" means
        // stay, so a refresh the user has thought better of must not still be
        // waiting to happen behind the card. The Back trap is re-armed for the
        // next press (the sentinel was consumed getting here).
        this._pendingExit = null;
        this._exitGuard?.rearm();
        this._closeDropGuard();
        return;

      case "reward-drop-leave": {
        // WHICH STATUS THIS WRITES DEPENDS ON WHO RAISED THE GUARD, and getting
        // that wrong locked a real tester out of the campaign (row 1213 on
        // stage, 2026-08-08).
        //
        // Three intents reach this one button, and only one of them refuses the
        // offer:
        //
        //   vignette / scrim click  — the user went looking for the way out.
        //     That is an answer, and it writes `dropped`: TERMINAL, so we stop
        //     asking at every login.
        //   intercepted F5 / Back   — the user asked to RELOAD or GO BACK, and
        //     we interrupted them to ask about it. Pressing "Drop anyway" here
        //     means "yes, do the thing I asked for", not "I do not want the
        //     reward". It writes the recoverable `left`.
        //
        // Reporting the second as `dropped` inverted the whole design by
        // information: a closed tab, where we know NOTHING, stayed recoverable,
        // while an intercepted refresh — where we know exactly what the user
        // meant, and know it was benign — was terminal. Phase 2 exists to stop
        // one stray F5 costing someone a prize; routing that same F5 into this
        // button did it anyway, just with a confirmation on top.
        //
        // `_pendingExit` is the discriminator and needs no new state: it is set
        // only by onExitIntent, cleared by "Continue", and null whenever the
        // user raised the card themselves.
        //
        // The post is AWAITED here, unlike every other tracking call: this exit
        // can be a RELOAD, and a request still in flight when the page goes is
        // a row the funnel never sees. Bounded by DROP_POST_TIMEOUT_MS so a
        // hung network cannot strand the user on a guard they have dismissed.
        if (this._leaving) return;
        this._leaving = true;
        const exit = this._pendingExit;
        this._pendingExit = null;
        const post = this._track(exit ? "left" : "dropped");
        const settled = Promise.race([
          post,
          new Promise((r) => setTimeout(r, DROP_POST_TIMEOUT_MS)),
        ]);
        settled.then(() => {
          this._finish();
          this._resumeExit(exit);
        });
        return;
      }

      case "reward-finish":
        // Congrats' "Go to dashboard" — onUploadDone already reported `done`.
        return this._finish();

      case "reward-soldout-dismiss":
        // The sold-out notice's only button. Unlike congrats it still has a
        // post to make: 'missed' is what keeps the notice from reappearing.
        return this._dismissSoldOut();

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

__reward_flow.initClass();
module.exports = __reward_flow;
