/**
 * Reward onboarding flow — Figma section 3275:236091.
 *
 * A 3-step activation flow for users arriving from the "Claim Your Free
 * Storage" marketing email:
 *
 *   step1          → "your workspace is ready", informational
 *   step2          → "Upload" fires the desk's _e.upload service
 *   step2_waiting  → the real uploader is open; RADIO_MEDIA _e.uploaded advances
 *   step3          → "Invite member" fires the desk's "invite-member" service
 *   step3_waiting  → the real invite popup is open; onInvitationSent() advances
 *   congrats       → modal, then the flow latches itself off for good
 *
 * A drop modal intercepts clicks on the vignette during the active steps.
 * Back is navigation only: `_furthest` never rewinds, so a user who steps
 * back does not have to redo a completed action.
 *
 * UI-only: nothing is granted server-side. See
 * docs/superpowers/specs/2026-07-23-reward-onboarding-flow-design.md
 */
const { dropModal, congratsModal } = require("./skeleton/modal");

const CAMPAIGN = "free-storage";
const KEY_UTM = "drumee_utm";
const KEY_DONE = "reward_flow_done";
const KEY_STEP = "reward_step";

const STEPS = ["step1", "step2", "step3"];

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
    return !!utm && utm.utm_campaign === CAMPAIGN;
  }

  initialize(opt = {}) {
    super.initialize(opt);
    this.declareHandlers();

    // Resume where the user left off. Waiting states resume as their base
    // step: the uploader/invite popup they were handed off to is long gone.
    const stored = (lsGet(KEY_STEP) || "").replace("_waiting", "");
    this._step = STEPS.includes(stored) ? stored : "step1";
    this._furthest = STEPS.indexOf(this._step) + 1;
    this._modalOpen = false;
    this._dropReturnStep = null;
    this._inviteSucceeded = false;

    this._onUploaded = () => this.onUploadDone();
    if (typeof RADIO_MEDIA !== "undefined") {
      RADIO_MEDIA.on(_e.uploaded, this._onUploaded);
    }

    // media_form broadcasts "workspace:refresh" after desk.create_hub succeeds
    // — the completion signal that advances step 1, mirroring the upload signal
    // for step 2.
    this._onWorkspaceRefresh = (payload) => this.onWorkspaceCreated(payload);
    if (typeof RADIO_BROADCAST !== "undefined") {
      RADIO_BROADCAST.on("workspace:refresh", this._onWorkspaceRefresh);
    }
  }

  onDomRefresh() {
    this._openHostClickThrough();
    this._render();
  }

  /**
   * The flow is fed into the desk's `overlay` part — a full-viewport backdrop
   * (z-index 10010) that sits ABOVE the main content (z 10001, which holds the
   * topbar). The desk opens it (`data-state="open"`) so we're visible, but
   * "open" also makes it `pointer-events:auto`, so that backdrop swallows every
   * click meant for the real desk chrome our Step 1 spotlight points at — the
   * vignette is `pointer-events:none` and passes the click down, but the
   * overlay element itself then catches it. Force the host visible-but-
   * click-through; our own card / coach opt pointer events back in. Restored on
   * teardown so the desk's backdrop behaves normally afterwards.
   */
  _openHostClickThrough() {
    if (!this.el) return;
    // Target the desk backdrop specifically (it carries the blocking
    // pointer-events), through any intermediate wrapper the part feed adds.
    const host =
      (this.el.closest && this.el.closest(".desk-module__overlay")) ||
      this.el.parentElement;
    if (!host || !host.style) return;
    this._host = host;
    this._hostPE = host.style.pointerEvents;
    this._hostOpacity = host.style.opacity;
    host.style.pointerEvents = "none";
    host.style.opacity = "1";
  }

  _restoreHost() {
    const host = this._host;
    if (!host || !host.style) return;
    host.style.pointerEvents = this._hostPE || "";
    host.style.opacity = this._hostOpacity || "";
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
    this._stopGuide();
    this._restoreHost();
  }

  // ───────── step 1 guided walkthrough ─────────

  /** Lazily build and start the guide. `./guide` is required lazily so the
   *  orchestrator stays requirable (and unit-testable) under Node — the guide
   *  no-ops when there is no DOM. */
  _startGuide() {
    if (!this._guide) {
      const RewardGuide = require("./guide");
      this._guide = new RewardGuide(this);
    }
    this._guide.start();
  }

  _stopGuide() {
    if (this._guide) this._guide.stop();
  }

  /**
   * Paint the spotlight cutout over `rect` (a viewport-space DOMRect) and feed
   * the coach tooltip. Called by the guide as it walks the live desk chrome.
   */
  spotlight(rect, text, showBack = true, mode = "circle") {
    if (!this.el) return;
    const cx = rect.left + rect.width / 2;
    if (mode === "rect") {
      // Large panels (form / permission panels): clear the panel rect and dim
      // only the rest — no circular highlight. The box-shadow cutout does the
      // dimming (see skin __cutout); a little padding gives the panel breathing
      // room.
      const pad = 6;
      this.el.style.setProperty("--cut-x", `${rect.left - pad}px`);
      this.el.style.setProperty("--cut-y", `${rect.top - pad}px`);
      this.el.style.setProperty("--cut-w", `${rect.width + 2 * pad}px`);
      this.el.style.setProperty("--cut-h", `${rect.height + 2 * pad}px`);
    } else {
      const cy = rect.top + rect.height / 2;
      const halfDiag =
        Math.sqrt(rect.width * rect.width + rect.height * rect.height) / 2;
      const r = Math.max(120, halfDiag + 40);
      this.el.style.setProperty("--spot-x", `${cx}px`);
      this.el.style.setProperty("--spot-y", `${cy}px`);
      this.el.style.setProperty("--spot-radius", `${r}px`);
    }
    this.el.dataset.guideMode = mode;
    const anchor = this._coachAnchor(rect, cx);
    this.ensurePart("guide-callout").then((p) => {
      if (!p) return;
      p.feed(
        require("./skeleton/coach")(this, {
          text,
          style: anchor.style,
          side: anchor.side,
          showBack,
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
  _coachAnchor(rect, cx) {
    const win = typeof window !== "undefined" ? window : null;
    const vw = (win && win.innerWidth) || 1280;
    const vh = (win && win.innerHeight) || 800;
    const M = 12;       // viewport margin
    const TOP = 64;     // keep clear of the ~52px topbar
    const CH = 104;     // approx coach height
    const CW = 260;     // coach max-width (see skin __coach)
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

  clearSpotlight() {
    this.ensurePart("guide-callout").then((p) => p && p.feed(null));
  }

  // ───────── skeleton accessors ─────────

  getStep() { return this._step; }
  getFurthest() { return this._furthest; }

  // ───────── state ─────────

  _render() {
    this.feed(require("./skeleton")(this));
  }

  /**
   * Move to `step` and re-render. `_furthest` is a high-water mark, so Back
   * navigation never rewinds the progress bar.
   */
  _goto(step) {
    this._step = step;
    const idx = STEPS.indexOf(step.replace("_waiting", "")) + 1;
    if (idx > this._furthest) this._furthest = idx;
    lsSet(KEY_STEP, step);
    this._render();
  }

  _isWaiting() { return this._step.endsWith("_waiting"); }

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
    if (payload && payload.personal) {
      this._stopGuide();
      this._goto("step2");
      return;
    }
    if (this._guide) this._guide.onWorkspaceCreated();
    else this.onGuideComplete();
  }

  /** The guide finished its perm phase (permission panel closed) → Step 2. */
  onGuideComplete() {
    if (this._step !== "step1_guide") return;
    this._stopGuide();
    this._goto("step2");
  }

  /** A file upload completed. Advances step 2 only while it is waiting. */
  onUploadDone() {
    if (this._step !== "step2_waiting") return;
    this._goto("step3");
  }

  /** An invitation was sent successfully. The invite popup closes right after
   *  this (clearing the shared modal host on its way out), so we only LATCH the
   *  success here and defer opening the congrats modal until onInvitePopupClosed
   *  fires — by then the host is free. */
  onInvitationSent() {
    if (this._step !== "step3_waiting") return;
    this._inviteSucceeded = true;
  }

  /** The invite popup closed. Two cases:
   *  - it closed because the send succeeded → open congrats now (host is free);
   *  - it closed without sending → re-arm step 3 so the user can retry. */
  onInvitePopupClosed() {
    if (this._inviteSucceeded) {
      this._inviteSucceeded = false;
      this._step = "congrats";
      // The invite popup's close cleared Wm.__wrapperModal via collection.reset(),
      // and this callback runs DURING that reset's synchronous unwind. Feeding
      // congrats back in now would leave an orphaned, untracked view in the shared
      // host. Defer one microtask so the reset fully settles first.
      Promise.resolve().then(() => {
        if (this.isDestroyed && this.isDestroyed()) return;
        if (!this._openModal(congratsModal(this))) this._finish();
      });
      return;
    }
    if (this._step !== "step3_waiting") return;
    this._goto("step3");
  }

  // ───────── modals ─────────

  /**
   * @returns {boolean} false when there is no modal host to render into —
   *   callers decide whether that is fatal for their step.
   */
  _openModal(tree) {
    if (typeof Wm === "undefined" || !Wm.__wrapperModal) return false;
    Wm.__wrapperModal.feed(tree);
    Wm.__wrapperModal.el.dataset.state = "open";
    Wm.__wrapperModal.el.dataset.overlay = "blur";
    this._modalOpen = true;
    return true;
  }

  _closeModal() {
    if (!this._modalOpen) return;
    if (typeof Wm !== "undefined" && Wm.__wrapperModal) {
      Wm.__wrapperModal.clear();
      Wm.__wrapperModal.el.dataset.state = "closed";
      delete Wm.__wrapperModal.el.dataset.overlay;
    }
    this._modalOpen = false;
  }

  /** Final exit — from "Drop anyway" or "Go to dashboard". Never shown again. */
  _finish() {
    lsSet(KEY_DONE, "1");
    lsDel(KEY_STEP);
    this._closeModal();
    this._unbind();
    this.softDestroy();
  }

  // ───────── event routing ─────────

  onUiEvent(cmd, args = {}) {
    const service = args.service || (cmd && cmd.mget && cmd.mget(_a.service));
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

      case "reward-upload":
        this._goto("step2_waiting");
        // Reaches modules/desk through the uiHandler chain -> Wm.handleUpload().
        this.triggerHandlers({ service: _e.upload });
        return;

      case "reward-invite":
        this._goto("step3_waiting");
        // Reaches modules/desk -> _openInvitePopup().
        this.triggerHandlers({ service: "invite-member" });
        return;

      case "reward-back": {
        // Back out of the Step 1 walkthrough → tear the guide down and return
        // to the Step 1 card.
        if (this._step === "step1_guide") {
          this._stopGuide();
          return this._goto("step1");
        }
        const base = this._step.replace("_waiting", "");
        if (this._isWaiting()) return this._goto(base);
        const prev = STEPS[STEPS.indexOf(base) - 1];
        if (prev) this._goto(prev);
        return;
      }

      case "reward-vignette-click":
        // Inert while the user is being handed off to a real surface. The CSS
        // already makes the vignette click-through when waiting/guiding, but
        // guard explicitly too — consistent with reward-continue/reward-back.
        if (this._isWaiting() || this._step === "step1_guide" || this._modalOpen)
          return;
        this._dropReturnStep = this._step;
        this._openModal(dropModal(this));
        return;

      case "reward-drop-stay":
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
