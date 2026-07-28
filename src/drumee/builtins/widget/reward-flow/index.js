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
 *                    ways in: the INTERNAL (team) permission panel the
 *                    walkthrough ends on, which IS Step 2 — it is where members
 *                    are invited — so Step 1 hands straight over to it
 *                    (onInvitePanel); or the invite popup opened from the card,
 *                    where onInvitationSent() advances. Either way the step is
 *                    completed by an invitation actually going out: closing the
 *                    panel without sending one is a Back to the step2 card
 *                    (_awaitPanelClosed). Every other Step 1 outcome —
 *                    personal, external/secure-share — lands on the step2 card
 *                    first.
 *   step3          → "Upload" fires the desk's _e.upload service
 *   step3_waiting  → the real uploader is open; RADIO_MEDIA _e.uploaded advances
 *   step3_guide    → the walkthrough inside the workspace created in Step 1. It
 *                    outlives the upload: _e.uploaded moves it onto its
 *                    "uploading" and "files" beats (see guide-upload), and the
 *                    Next on the last one advances
 *   congrats       → modal, then the flow latches itself off for good
 *
 * A drop modal intercepts clicks on the vignette during the active steps.
 * The progress bar tracks the CURRENT step (step N lights N segments), so Back
 * rewinds it too.
 *
 * UI-only: nothing is granted server-side. See
 * docs/superpowers/specs/2026-07-23-reward-onboarding-flow-design.md
 */
const { dropModal, congratsModal } = require("./skeleton/modal");
const { STEPS, baseStep, isWaiting, isGuiding } = require("./steps");
const { readDescriptor } = require("./workspace");
// Mid-run scratch state — see storage.js. Eligibility and the resume point are
// the server's (reward.get_state); only this one key is still local.
const {
  KEY_WORKSPACE, runGet, runSet, runDel, purgeLegacyKeys,
} = require("./storage");

// Recorded on every funnel post so the row says which campaign it belongs to.
// Must match the utm_campaign analytics-server puts on the claim-reward email
// CTA (service/index.js _rewardCtaLink).
const CAMPAIGN = "free-storage";

// How long "Open workspace" waits for the workspace window before giving up and
// dropping Step 3 to its legacy topbar-upload variant. Loading is a fetch plus
// a mount; anything past this is a failure, not slowness.
const OPEN_WORKSPACE_TIMEOUT_MS = 4000;

// The surfaces Step 2 hands the user to, all fed into the shared wrapper-modal:
// the internal permission panel Step 1 ends on (onInvitePanel) OR the invite
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

// The live topbar control each step points at. The cutout is laid over it and
// the card anchored beneath it (see _applyStepTarget).
const STEP_TARGET = {
  step2: ".desk-module-topbar__invite-btn",
  step3: ".desk-module-topbar__upload-btn",
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

    // Resume point comes from the SERVER (reward.get_state -> reward_claim.step,
    // fed in by the desk gate), so a user who wandered off mid-walkthrough picks
    // up where they were even on a different device. baseStep still strips both
    // _waiting and _guide: the uploader / invite popup / walkthrough they were
    // handed off to is long gone, so every transient state resumes as its card
    // step.
    const stored = baseStep(opt.step);
    this._step = STEPS.includes(stored) ? stored : "step1";
    this._modalOpen = false;
    this._dropReturnStep = null;
    this._inviteSucceeded = false;
    this._dropGuardOpen = false;
    // Step 2 is being served by the permission panel Step 1 ended on, not by
    // the invite popup — see onInvitePanel. Never restored on resume: the panel
    // is long gone by then, so a reload resumes on the plain Step 2 card.
    this._invitePanelOpen = false;
    // …and an invitation really went out from it, which is what separates
    // closing that panel as "done" from closing it as Back.
    this._inviteSent = false;
    // Furthest card step already reported to the server this session — see
    // _trackStep. Not persisted: re-posting a step after a reload is harmless
    // (the server keeps the furthest one) and losing one is not.
    this._trackedStep = null;
    // A descriptor left by an abandoned run must not pre-answer this one: only
    // trust it when RESUMING a run that already reached Step 2. A run that
    // starts at Step 1 will create its own workspace.
    this._workspace =
      this._step !== "step1" ? readDescriptor(runGet(KEY_WORKSPACE)) : null;
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
  }

  onDomRefresh() {
    this._captureHost();
    this._portalToBody();
    this._render();
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
    this._stopGuide();
    this._stopUploadGuide();
    this._clearOpenTimer();
    this._stopToastWatch();
    this._stopPanelWatch();
    this._restoreHost();
    this._watchInviteBackdrop(false);
    this._markInviteOverlay(false);
  }

  // ───────── step 1 guided walkthrough ─────────

  /** Lazily build and start the guide. `./guide` is required lazily so the
   *  orchestrator stays requirable (and unit-testable) under Node — the guide
   *  no-ops when there is no DOM. */
  _startGuide() {
    // Each walkthrough run establishes its own workspace. Back → Continue
    // restarts Step 1 and the user may pick a different workspace type this
    // time, so the previous attempt's result must not carry over.
    this._resetGuideResults();
    if (!this._guide) {
      const RewardGuide = require("./guide");
      this._guide = new RewardGuide(this);
    }
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

  /**
   * Paint the spotlight cutout over `rect` (a viewport-space DOMRect) and feed
   * the coach tooltip. Called by a guide as it walks the live desk chrome.
   *
   * @param {DOMRect} rect
   * @param {{text: string, showBack?: boolean, showNext?: boolean,
   *          radius?: string}} opt
   */
  spotlight(rect, opt = {}) {
    if (!this.el) return;
    const {
      text, showBack = true, showNext = false, radius = "", hole = true,
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
      ? this._coachCenter()
      : this._coachAnchor(rect, cx);
    this.ensurePart("guide-callout").then((p) => {
      if (!p) return;
      p.feed(
        require("./skeleton/coach")(this, {
          text,
          style: anchor.style,
          side: anchor.side,
          showBack,
          showNext,
        }),
      );
    });
  }

  /**
   * Position the coach as a viewport-space {left, top}, always fully on screen
   * and clear of the topbar. Small targets (add / menu / form) get the coach
   * just below (or above) them. Tall panels (the perm-phase permission panels /
   * secure-share dock, which can fill most of the height) can't be cleared
   * vertically, so the coach drops into the widest empty margin beside the
   * panel — or, when the panel is effectively full-width, pins just under the
   * topbar. This is what fixes the coach being clipped off the top edge.
   */
  /**
   * Centre the coach in the viewport. Used when nothing is spotlighted (see
   * spotlight's `hole: false`): with the whole screen dimmed there is no target
   * to sit beside, so the callout becomes the only thing on screen.
   */
  _coachCenter() {
    const win = typeof window !== "undefined" ? window : null;
    const vw = win?.innerWidth || 1280;
    const vh = win?.innerHeight || 800;
    const CH = 156;   // approx coach height — same figure _coachAnchor uses
    const TOP = 64;   // keep clear of the ~52px topbar
    // `left` is the coach's CENTRE: the skin translates it -50% on X.
    return {
      side: "below",
      style: {
        left: `${vw / 2}px`,
        top: `${Math.max(TOP, (vh - CH) / 2)}px`,
      },
    };
  }

  _coachAnchor(rect, cx) {
    const win = typeof window !== "undefined" ? window : null;
    const vw = win?.innerWidth || 1280;
    const vh = win?.innerHeight || 800;
    const M = 12;       // viewport margin
    const TOP = 64;     // keep clear of the ~52px topbar
    const CH = 156;     // approx coach height (brand header + text + button)
    const CW = 300;     // coach width (see skin __coach)
    const half = CW / 2;
    const clampX = (x) => Math.min(Math.max(x, M + half), vw - M - half);
    const clampY = (y) => Math.min(Math.max(y, TOP), vh - CH - M);

    // Tall panel: place the coach in whichever margin is wide enough, sitting
    // just OUTSIDE the panel's near edge (not centred in the gap) so it reads as
    // attached to the panel it points at, vertically centred on the panel.
    if (rect.height > vh * 0.6) {
      const leftGap = rect.left;
      const rightGap = vw - rect.right;
      const midY = clampY(rect.top + rect.height / 2 - CH / 2);
      if (leftGap >= CW + 2 * M && leftGap >= rightGap) {
        return { side: "left", style: { left: `${clampX(rect.left - M - half)}px`, top: `${midY}px` } };
      }
      if (rightGap >= CW + 2 * M) {
        return { side: "right", style: { left: `${clampX(rect.right + M + half)}px`, top: `${midY}px` } };
      }
      // Full-width: pin under the topbar, centred on the panel.
      return { side: "below", style: { left: `${clampX(cx)}px`, top: `${TOP}px` } };
    }

    // Small target: below if it fits, else above, else clamped.
    const below = rect.bottom + M;
    const above = rect.top - M - CH;
    let top;
    let side;
    if (below + CH + M <= vh) { top = below; side = "below"; }
    else if (above >= TOP) { top = above; side = "above"; }
    else { top = TOP; side = "below"; }
    return { side, style: { left: `${clampX(cx)}px`, top: `${clampY(top)}px` } };
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
   * Fire-and-forget in every sense: the flow is a UI walkthrough and a tracking
   * outage must never stall it or surface an error to the user, so failures are
   * swallowed and nothing awaits the response. The server advances status/step
   * by rank, so a duplicated or late post is harmless.
   *
   * Skipped for a ?reward=1 run: that one was forced past the eligibility gate
   * for testing, and it already declines to latch reward_flow_done for the same
   * reason (see _finish). Letting it write would put team accounts in the
   * campaign funnel.
   *
   * @param {String} status "started" | "dropped" | "done"
   * @param {String} [step] defaults to the current card step
   */
  _track(status, step) {
    if (this._forced) return;
    if (typeof SERVICE === "undefined" || !SERVICE.reward || !SERVICE.reward.track) return;
    try {
      this.postService(SERVICE.reward.track, {
        hub_id: Visitor.id,
        status,
        step: step || baseStep(this._step),
        campaign: CAMPAIGN,
      }).catch(() => {});
    } catch (e) {
      /* tracking must never break the flow */
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

  // ───────── skeleton accessors ─────────

  getStep() { return this._step; }

  // ───────── state ─────────

  _render() {
    this.feed(require("./skeleton")(this));
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
    requestAnimationFrame(() => this._applyStepTarget());
    if (!this._onStepResize && typeof window !== "undefined") {
      this._onStepResize = () => this._applyStepTarget();
      window.addEventListener("resize", this._onStepResize, { passive: true });
    }
  }

  _applyStepTarget() {
    if (!this.el) return;
    // Resolved from the BASE step, so entering a waiting state keeps the cutout
    // and the card exactly where they were instead of snapping to the fallback.
    const base = baseStep(this._step);
    // Step 2 served by the permission panel spotlights the PANEL — it is the
    // surface in play, and cutting it out is also what makes the dim cover the
    // whole viewport: the box-shadow around the hole is painted by our root,
    // which is portaled to document.body and lifted over the wrapper-modal, so
    // it reaches the topbar and sidebar that the modal's own backdrop (confined
    // to the desk's wm-container) never covered.
    const onPanel = base === "step2" && this._invitePanelOpen;
    // Anchored to nothing and centred like Step 1 (see skin __anchor): the
    // panel Step 2 above — its spotlight is a tall right-hand rail, not
    // something to hang a card under — and a Step 3 that will guide the user
    // inside the workspace rather than at the desk topbar.
    const notarget = onPanel || (base === "step3" && !!this._workspace);
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
    // PANEL_SURFACES, not the panel alone: sending an invitation replaces the
    // panel with its confirmation, and querySelector then returns whichever is
    // actually there — so the hole follows the surface instead of staying
    // behind on the rect of one that has gone.
    const sel = onPanel ? PANEL_SURFACES : (notarget ? null : STEP_TARGET[base]);
    if (!sel) return;
    const el = document.querySelector(sel);
    if (!el || typeof el.getBoundingClientRect !== "function") return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // Cutout hugs the target exactly, mirroring its own rounding.
    const radius =
      (typeof getComputedStyle === "function" && getComputedStyle(el).borderRadius) || "";
    this.el.style.setProperty("--cut-x", `${rect.left}px`);
    this.el.style.setProperty("--cut-y", `${rect.top}px`);
    this.el.style.setProperty("--cut-w", `${rect.width}px`);
    this.el.style.setProperty("--cut-h", `${rect.height}px`);
    this.el.style.setProperty("--cut-radius", radius || "8px");

    // Centred states are done: the cutout is the whole job there.
    if (notarget) return;
    // Card sits under the control, centred on it and kept on screen.
    if (!anchor || !anchor.style) return;
    const vw = (typeof window !== "undefined" && window.innerWidth) || 1280;
    const vh = (typeof window !== "undefined" && window.innerHeight) || 800;
    const M = 12;
    const CARD_W = 340;
    const CARD_H = 340;
    const half = CARD_W / 2;
    const cx = rect.left + rect.width / 2;
    const left = Math.min(Math.max(cx, M + half), vw - M - half);
    const top = Math.min(Math.max(rect.bottom + 16, 64), vh - CARD_H - M);
    anchor.style.left = `${left}px`;
    anchor.style.top = `${top}px`;
    anchor.style.right = "auto";
    anchor.style.transform = "translateX(-50%)";
  }

  /** Move to `step`, report it and re-render. The step is persisted SERVER-side
   *  by _trackStep below (reward_claim.step), which is also where a resume on
   *  another device reads it from — nothing about the position is kept locally. */
  _goto(step) {
    this._step = step;
    this._trackStep(baseStep(step));
    // While a real Step 2 surface is open (step2_waiting), take the default
    // frosted glass off its wrapper-modal and guard the backdrop against a
    // stray click abandoning the flow. The invite popup gets the flow's flat
    // dim; the permission panel gets "bare", because there our own cutout is
    // already dimming the whole viewport around it and a second layer of the
    // same colour would just double it.
    this._markInviteOverlay(
      step === "step2_waiting" && (this._invitePanelOpen ? "bare" : "1"),
    );
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
    if (this._guide) this._guide.onWorkspaceCreated();
    else this.onGuideComplete();
  }

  /**
   * The walkthrough reached the INTERNAL (team) permission panel — the surface
   * that invites members. That IS what Step 2 asks for, so the flow enters
   * Step 2 on it rather than trailing Step 1 and then asking for the same thing
   * again on a card.
   *
   * Step 1 ENDS here: the walkthrough is stopped and the Step 2 card takes the
   * coach's place. Running the two side by side was the alternative and it does
   * not work — the guide and the card both drive the --cut-* vars and both
   * claim the overlay, and a walkthrough state renders no card at all, which is
   * why counting the panel as Step 2 showed nothing on screen.
   *
   * The external (secure-share) branch is NOT this: it opens a share dock, not
   * an invite panel, so it stays inside Step 1 and lands on the Step 2 card
   * with its Invite button, exactly as before.
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
   *   closed  → the panel's own X is a Back: nothing was asked for and nothing
   *             was given, so the flow returns to the Step 2 card, where
   *             "Invite member" opens the popup instead. Exactly what the
   *             card's own Back does (see reward-back).
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
   * No safety timer — the panel is on screen when this is armed, so its
   * absence can only mean the user closed it.
   */
  _awaitPanelClosed() {
    const advance = () => {
      this._stopPanelWatch();
      const sent = this._inviteSent;
      this._invitePanelOpen = false;
      this._inviteSent = false;
      // Deferred a microtask for the same reason as _awaitToastDismissed: the
      // observer fires DURING the panel's removal unwind, so let that settle
      // before rendering the next step over the same host.
      Promise.resolve().then(() => {
        if (this.isDestroyed?.()) return;
        this._goto(sent ? "step3" : "step2");
      });
    };
    const onScreen = () =>
      typeof document !== "undefined" && !!document.querySelector(PANEL_SURFACES);
    if (typeof MutationObserver === "undefined" || !onScreen()) {
      // Nothing to watch, or it went as we armed → don't strand the user on a
      // step that can then never end.
      return advance();
    }
    this._panelObs = new MutationObserver(() => {
      if (!onScreen()) return advance();
      // Still there — keep the hole on it. The panel mounts, animates in and
      // reflows as the permissions list grows, and the cutout is the only
      // reason it reads clear of the dim, so a stale rect is a visible hole in
      // the wrong place. Safe against feedback: the cutout is driven through
      // inline CSS vars and this watches childList only, not attributes.
      this._applyStepTarget();
    });
    this._panelObs.observe(document.body, { childList: true, subtree: true });
  }

  _stopPanelWatch() {
    if (this._panelObs) {
      this._panelObs.disconnect();
      this._panelObs = null;
    }
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
   * at all) and external/secure-share. The internal branch leaves the guide the
   * moment its panel appears — that panel IS Step 2, and _awaitPanelClosed
   * carries it from there (see onInvitePanel).
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

  /** Claim the reward and show congrats. The uploader is the OS file picker
   *  plus a progress window, so nothing else is holding the shared modal host
   *  by now. */
  _completeStep3() {
    this._stopUploadGuide();
    this._clearOpenTimer();
    // The upload IS the claim — report it before any of the teardown below, so
    // a failure while closing the workspace still leaves the funnel correct.
    this._track("done", "step3");
    // The reward is claimed, so hand the desk back at Home rather than leaving
    // the user to dismiss a workspace the flow walked them into.
    this._closeStep3Workspace();
    this._step = "congrats";
    // Re-render BEFORE opening the modal. stop() only clears the coach; the
    // cutout and the full-viewport __guide-scrim stay in the markup, and a
    // guiding root outranks the wrapper-modal that hosts congrats — leaving
    // them would grey the confirmation out and eat its button. Deliberately not
    // _goto: "congrats" must not be persisted as a resumable step.
    this._render();
    // "bare": the re-render above leaves a full-viewport vignette behind the
    // modal, so the wrapper-modal must not stack a second dim on top of it.
    if (!this._openModal(congratsModal(this), "bare")) this._finish();
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
    this._markRootDrop(true);
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

  /** Flag the flow ROOT while the in-root guard is up — the z-index lift is
   *  keyed off `__root[data-drop]` (the lift has to sit on the root: it owns
   *  the flow's stacking context, so no z-index on the host inside it can
   *  escape the wrapper-modal above). The skeleton's root box is fed as a child
   *  of our element; falling back to the element itself keeps this working if
   *  it is ever the root, since the rule matches on the class either way. */
  _markRootDrop(on) {
    const root =
      this.el?.querySelector?.(`.${this.fig.family}__root`) || this.el;
    if (!root?.dataset) return;
    if (on) root.dataset.drop = "1";
    else delete root.dataset.drop;
  }

  /**
   * Final exit — from "Drop anyway" or "Go to dashboard". Never shown again,
   * "Never again" is now the SERVER's record, not a local latch: the terminal
   * status written by _track (done / dropped) is what makes the next
   * reward.get_state answer no. A ?reward=1 run reports nothing at all (see
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
    const guided = this._step === "step1_guide";
    if (!guided && this._step !== "step2_waiting") return;
    // The shared wrapper-modal. At these two steps whatever sits in it is
    // there because of us: Step 1's create form or its follow-up permission
    // panel (media_form feeds `permission_restricted` into this same host), or
    // Step 2's invite popup and the confirmation that replaces it.
    this._clearWrapperModal();
    // The perm phase's OTHER branch. An external ("share") workspace opens the
    // secure-share dock as a real WINDOW (media_form → Wm.launch), not into the
    // wrapper-modal, so clearing that host above does not touch it. Same
    // sub-step, same abandonment, same orphan.
    if (guided) this._closeSecureShare();
  }

  /** Close the secure-share dock the Step 1 create step may have launched.
   *  Driven through the window's own close service, like _closeStep3Workspace,
   *  so it unregisters from the pool instead of just leaving the DOM. During
   *  the walkthrough the flow owns the screen, so any such window is the one
   *  that step just opened. */
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
        // the real desk chrome (Add new → Workspace item → the form) and lets
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
          // Back out of the permission panel: the workspace exists, so there is
          // no rewinding past it — this only says "not from here". Stop
          // watching the panel (its close must not then be read as an outcome),
          // close it, and fall back to the plain Step 2 card, whose Invite
          // button opens the popup instead. The panel's own X takes the same
          // route by a different road: it closes the panel, and a close with
          // nothing sent IS this (see _awaitPanelClosed).
          this._stopPanelWatch();
          this._invitePanelOpen = false;
          this._inviteSent = false;
          this._clearWrapperModal();
          return this._goto("step2");
        }
        if (this._step === "step3_guide") {
          // The Step 3 guide has no step-back (see guide-upload): Back leaves
          // the walkthrough for the card, workspace still open.
          this._stopUploadGuide();
          this._clearOpenTimer();
          return this._goto("step3");
        }
        const base = baseStep(this._step);
        if (this._isWaiting()) return this._goto(base);
        const prev = STEPS[STEPS.indexOf(base) - 1];
        if (prev) this._goto(prev);
        return;
      }

      case "reward-vignette-click":
        // Inert while the user is being handed off to a real surface, or when a
        // drop modal is already up. A waiting step is not unguarded, though:
        // step2_waiting raises the same guard from the invite popup's own
        // backdrop (see _watchInviteBackdrop).
        if (this._isWaiting() || this._modalOpen || this._dropGuardOpen) return;
        // During either walkthrough the dimmed frame (__guide-scrim) fires this
        // too: guard the walkthrough without tearing it down or touching the
        // wrapper-modal that may hold the create-form.
        if (isGuiding(this._step)) {
          this._openDropGuard();
          return;
        }
        this._dropReturnStep = this._step;
        this._openModal(dropModal(this));
        return;

      case "reward-drop-stay":
        // In the walkthrough — and on step2_waiting — the guard lives in our
        // own root, so closing it just hands the user back what was underneath:
        // the guide resumes, or the invite popup is still there with whatever
        // they had typed. Nothing was torn down.
        if (this._dropGuardOpen) {
          this._closeDropGuard();
          return;
        }
        this._closeModal();
        if (this._dropReturnStep) this._goto(this._dropReturnStep);
        this._dropReturnStep = null;
        return;

      case "reward-drop-leave":
        // "Drop anyway" is the only place the user says outright that they are
        // abandoning the flow, so it is the only place `dropped` is written.
        // Closing the tab mid-flow leaves them at `started`, which is the
        // honest reading: they never told us either way.
        this._track("dropped");
        return this._finish();

      case "reward-finish":
        // Congrats' "Go to dashboard" — onUploadDone already reported `done`.
        return this._finish();

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

__reward_flow.initClass();
module.exports = __reward_flow;
