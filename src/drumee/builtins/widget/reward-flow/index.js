/**
 * Reward onboarding flow — Figma section 3275:236091.
 *
 * A 3-step activation flow for users arriving from the "Claim Your Free
 * Storage" marketing email:
 *
 *   step1          → "your workspace is ready", informational
 *   step2          → "Invite member" fires the desk's "invite-member" service.
 *                    If the user ALREADY invited someone from the Step 1
 *                    permission panel, this becomes a plain "Continue" that
 *                    goes straight to step3 (see onPanelInvitation).
 *   step2_waiting  → the real invite popup is open; onInvitationSent() advances
 *   step3          → "Upload" fires the desk's _e.upload service
 *   step3_waiting  → the real uploader is open; RADIO_MEDIA _e.uploaded advances
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

const CAMPAIGN = "free-storage";
const KEY_UTM = "drumee_utm";
const KEY_DONE = "reward_flow_done";
const KEY_STEP = "reward_step";
// Latched when the user invites a member from the Step 1 permission panel, so
// Step 2 has nothing left to ask for. Persisted alongside the step so a reload
// mid-flow doesn't send them back to the invite popup.
const KEY_INVITED = "reward_invited";
// The workspace created in Step 1. Step 3 reopens it, so it must survive a
// reload the same way the step itself does.
const KEY_WORKSPACE = "reward_workspace";

// How long "Open workspace" waits for the workspace window before giving up and
// dropping Step 3 to its legacy topbar-upload variant. Loading is a fetch plus
// a mount; anything past this is a failure, not slowness.
const OPEN_WORKSPACE_TIMEOUT_MS = 4000;

// The live topbar control each step points at. The cutout is laid over it and
// the card anchored beneath it (see _applyStepTarget).
const STEP_TARGET = {
  step2: ".desk-module-topbar__invite-btn",
  step3: ".desk-module-topbar__upload-btn",
};

/** localStorage is unavailable in private mode — never let it break the desk. */
function lsGet(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* quota/private mode */ }
}
function lsDel(key) {
  try { localStorage.removeItem(key); } catch (e) { /* quota/private mode */ }
}

class __reward_flow extends LetcBox {
  static initClass() {
    require("./skin");
  }

  /**
   * Campaign gate. Safe to call before the widget kind is even loaded.
   * @returns {boolean} true when this browser arrived from the campaign email
   *   and has not yet finished (or abandoned) the flow.
   */
  static isEligible() {
    if (lsGet(KEY_DONE) === "1") return false;
    let utm;
    try {
      utm = JSON.parse(lsGet(KEY_UTM) || "{}");
    } catch (e) {
      return false;
    }
    return utm?.utm_campaign === CAMPAIGN;
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();

    // Resume where the user left off. baseStep strips BOTH _waiting and
    // _guide: the uploader / invite popup / walkthrough the user was handed off
    // to is long gone after a reload, so every transient state resumes as its
    // card step.
    const stored = baseStep(lsGet(KEY_STEP));
    this._step = STEPS.includes(stored) ? stored : "step1";
    this._modalOpen = false;
    this._dropReturnStep = null;
    this._inviteSucceeded = false;
    this._guideDropOpen = false;
    // Only trust a persisted latch when RESUMING a run that already reached
    // Step 2. Landing on Step 1 means this is a fresh walkthrough, so whatever
    // an earlier — abandoned — run invited says nothing about this one; a key
    // left behind by that run would otherwise pre-answer Step 2 forever.
    this._inviteDone = this._step !== "step1" && lsGet(KEY_INVITED) === "1";
    if (!this._inviteDone) lsDel(KEY_INVITED);
    // Same reasoning: a descriptor left by an abandoned run must not pre-answer
    // this one. A run that starts at Step 1 will create its own workspace.
    this._workspace =
      this._step !== "step1" ? readDescriptor(lsGet(KEY_WORKSPACE)) : null;
    if (!this._workspace) lsDel(KEY_WORKSPACE);

    this._onUploaded = () => this.onUploadDone();
    if (typeof RADIO_MEDIA !== "undefined") {
      RADIO_MEDIA.on(_e.uploaded, this._onUploaded);
    }

    // media_form broadcasts "workspace:refresh" after desk.create_hub succeeds
    // — the completion signal that advances step 1, mirroring the invite signal
    // for step 2 and the upload signal for step 3.
    this._onWorkspaceRefresh = (payload) => this.onWorkspaceCreated(payload);
    // permission_restricted broadcasts this when a member is really invited
    // from the Step 1 permission panel — see onPanelInvitation.
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
    this._restoreHost();
    this._markInviteOverlay(false);
  }

  // ───────── step 1 guided walkthrough ─────────

  /** Lazily build and start the guide. `./guide` is required lazily so the
   *  orchestrator stays requirable (and unit-testable) under Node — the guide
   *  no-ops when there is no DOM. */
  _startGuide() {
    // Each walkthrough run answers Step 2 for itself. Back → Continue restarts
    // Step 1 and the user may pick a different workspace type this time, so the
    // previous attempt's answer must not carry over.
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
      lsDel(KEY_WORKSPACE);
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
   *  collection instead (same rationale as _closeGuideDrop). */
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
    // Two variants point at nothing and are centred like Step 1 (see skin
    // __anchor): a Step 2 already satisfied in Step 1, and a Step 3 that will
    // guide the user inside the workspace rather than at the desk topbar.
    const notarget =
      (base === "step2" && this._inviteDone) ||
      (base === "step3" && !!this._workspace);
    const sel = notarget ? null : STEP_TARGET[base];
    const anchor = this.el.querySelector(`.${this.fig.family}__anchor`);
    if (!sel) {
      // Steps with no topbar target (step 1) are centred by the stylesheet.
      // Clear any inline placement left over from step 2/3, otherwise a reused
      // anchor element keeps the card pinned under the Upload/Invite button.
      if (anchor?.style) {
        anchor.style.left = "";
        anchor.style.top = "";
        anchor.style.right = "";
        anchor.style.transform = "";
      }
      return;
    }
    const el = document.querySelector(sel);
    if (!el || typeof el.getBoundingClientRect !== "function") return;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    // Cutout hugs the control exactly, mirroring its own rounding.
    const radius =
      (typeof getComputedStyle === "function" && getComputedStyle(el).borderRadius) || "";
    this.el.style.setProperty("--cut-x", `${rect.left}px`);
    this.el.style.setProperty("--cut-y", `${rect.top}px`);
    this.el.style.setProperty("--cut-w", `${rect.width}px`);
    this.el.style.setProperty("--cut-h", `${rect.height}px`);
    this.el.style.setProperty("--cut-radius", radius || "8px");

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

  /** Move to `step`, persist it and re-render. */
  _goto(step) {
    this._step = step;
    lsSet(KEY_STEP, step);
    // While the invite popup is open (step2_waiting), tint its wrapper-modal
    // backdrop to match the flow's own dim instead of the default frosted glass.
    this._markInviteOverlay(step === "step2_waiting");
    this._render();
  }

  /**
   * Mark the shared wrapper-modal that hosts the invite popup so its backdrop
   * uses the flow's --overlay-bg (see skin) instead of the app's glass overlay.
   * Scoped to the reward flow — the topbar Invite button, which shares
   * _openInvitePopup, is left with the default look.
   */
  _markInviteOverlay(on) {
    if (typeof Wm === "undefined" || !Wm.__wrapperModal || !Wm.__wrapperModal.el) {
      return;
    }
    const ds = Wm.__wrapperModal.el.dataset;
    if (on) ds.rewardOverlay = "1";
    else delete ds.rewardOverlay;
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
      lsSet(KEY_WORKSPACE, JSON.stringify(ws));
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
   * A member was invited from the Step 1 permission panel (permission_restricted
   * broadcasts "invitation:sent"). Only counted DURING the walkthrough: an
   * invitation sent later, from the topbar or a settings panel, is not what
   * Step 2 is asking for.
   *
   * Latching this makes Step 2 offer a plain Continue instead of re-opening the
   * invite popup — the user has already done the thing it asks for.
   */
  onPanelInvitation() {
    if (this._step !== "step1_guide") return;
    this._inviteDone = true;
    lsSet(KEY_INVITED, "1");
  }

  /** Forget everything the Step 1 walkthrough established. It belongs to a
   *  single run: the user may pick a different workspace type this time, so
   *  Step 2 must re-earn its Continue (only permission_restricted, i.e.
   *  internal/team, ever sets that latch — personal, external/secure-share and
   *  internal-with-no-invite must all reach Step 2 with an Invite button), and
   *  Step 3 must open the workspace THIS run created. */
  _resetGuideResults() {
    this._inviteDone = false;
    lsDel(KEY_INVITED);
    this._workspace = null;
    lsDel(KEY_WORKSPACE);
  }

  /** True when Step 2's invite was already satisfied during Step 1. Read by the
   *  step card (Continue instead of Invite) and by the skeleton, which then
   *  drops the topbar cutout — there is no control left to point at. */
  inviteSatisfied() { return !!this._inviteDone; }

  /** True when Step 1 handed us a workspace to reopen. Read by the step card
   *  and the skeleton to pick the guided Step 3 over the legacy one. */
  hasStep1Workspace() { return !!this._workspace; }

  /** The guide finished its perm phase (permission panel closed) → Step 2. */
  onGuideComplete() {
    if (this._step !== "step1_guide") return;
    this._stopGuide();
    this._goto("step2");
  }

  /** A file upload completed — the LAST step. Only while step 3 is waiting.
   *  The uploader is the OS file picker plus a progress window, so nothing else
   *  is holding the shared modal host: congrats can open straight away. */
  onUploadDone() {
    if (this._step !== "step3_waiting" && this._step !== "step3_guide") return;
    this._stopUploadGuide();
    this._clearOpenTimer();
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
  }

  /** The invite popup closed. Two cases:
   *  - it closed because the send succeeded → advance to step 3 (upload);
   *  - it closed without sending → re-arm step 2 so the user can retry. */
  onInvitePopupClosed() {
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
    const TOAST = ".window-info__ui, .window-info__main";
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

  /** Open the "Don't drop now" modal DURING the Step 1 walkthrough. Rendered
   *  into the flow's own `guide-modal` part (not Wm.__wrapperModal), so the
   *  guided create-form / permission panel underneath is left untouched — a
   *  "Continue" simply closes this and the guide resumes. */
  _openGuideDrop() {
    this._guideDropOpen = true;
    this.ensurePart("guide-modal").then((p) => {
      if (!p) return;
      // Feed first, then flag open — the modal opts its own pointer events back
      // in (see skin __modal), so it stays clickable regardless; data-open only
      // drives the host's backdrop dim, and setting it after feed keeps a
      // re-render from wiping it.
      p.feed(dropModal(this));
      if (p.el?.dataset) p.el.dataset.open = "1";
    });
  }

  _closeGuideDrop() {
    this._guideDropOpen = false;
    this.ensurePart("guide-modal").then((p) => {
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

  /** Final exit — from "Drop anyway" or "Go to dashboard". Never shown again. */
  _finish() {
    lsSet(KEY_DONE, "1");
    lsDel(KEY_STEP);
    lsDel(KEY_INVITED);
    lsDel(KEY_WORKSPACE);
    this._closeModal();
    this._unbind();
    this.softDestroy();
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

      case "reward-invite-done":
        // Step 2's Continue, shown only when the user already invited someone
        // from the Step 1 permission panel. Nothing to open — just move on.
        this._goto("step3");
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
        // Step 3's "folder" beat has no real action to observe, so its coach
        // carries a Next.
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
        // drop modal is already up.
        if (this._isWaiting() || this._modalOpen || this._guideDropOpen) return;
        // During either walkthrough the dimmed frame (__guide-scrim) fires this
        // too: guard the walkthrough without tearing it down or touching the
        // wrapper-modal that may hold the create-form.
        if (isGuiding(this._step)) {
          this._openGuideDrop();
          return;
        }
        this._dropReturnStep = this._step;
        this._openModal(dropModal(this));
        return;

      case "reward-drop-stay":
        // In the walkthrough the drop modal lives in our own root; closing it
        // just resumes the guide (nothing was torn down).
        if (this._guideDropOpen) {
          this._closeGuideDrop();
          return;
        }
        this._closeModal();
        if (this._dropReturnStep) this._goto(this._dropReturnStep);
        this._dropReturnStep = null;
        return;

      case "reward-drop-leave":
      case "reward-finish":
        return this._finish();

      default:
        if (super.onUiEvent) super.onUiEvent(cmd, args);
    }
  }
}

__reward_flow.initClass();
module.exports = __reward_flow;
