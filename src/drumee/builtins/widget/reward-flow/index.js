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

    this._onUploaded = () => this.onUploadDone();
    if (typeof RADIO_MEDIA !== "undefined") {
      RADIO_MEDIA.on(_e.uploaded, this._onUploaded);
    }
  }

  onDomRefresh() {
    this._render();
  }

  onBeforeDestroy() {
    this._unbind();
  }

  _unbind() {
    if (this._onUploaded && typeof RADIO_MEDIA !== "undefined") {
      RADIO_MEDIA.off(_e.uploaded, this._onUploaded);
      this._onUploaded = null;
    }
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

  // ───────── external completion signals (called by modules/desk) ─────────

  /** A file upload completed. Advances step 2 only while it is waiting. */
  onUploadDone() {
    if (this._step !== "step2_waiting") return;
    this._goto("step3");
  }

  /**
   * An invitation was sent successfully. Advances step 3 only while waiting.
   * If the modal host is unavailable the user has still earned the ending, so
   * finish rather than stranding them in a waiting state with no way out.
   */
  onInvitationSent() {
    if (this._step !== "step3_waiting") return;
    // "congrats" is a terminal marker, not a member of STEPS: it must not
    // perturb _furthest/the progress bar. Setting it here (before opening
    // the modal) makes onInvitePopupClosed()'s "!== step3_waiting" guard
    // reject the popup-destroy that follows a successful send, so it can no
    // longer re-render the vignette over the congrats modal.
    this._step = "congrats";
    if (!this._openModal(congratsModal(this))) this._finish();
  }

  /** The invite popup closed without sending — re-arm step 3. */
  onInvitePopupClosed() {
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
      case "reward-continue": {
        // Inert while the user is being handed off to a real surface.
        if (this._isWaiting()) return;
        // From step1, or returning forward after a Back.
        const next = STEPS[STEPS.indexOf(this._step) + 1];
        if (next) this._goto(next);
        return;
      }

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
        const base = this._step.replace("_waiting", "");
        if (this._isWaiting()) return this._goto(base);
        const prev = STEPS[STEPS.indexOf(base) - 1];
        if (prev) this._goto(prev);
        return;
      }

      case "reward-vignette-click":
        // Inert while the user is being handed off to a real surface.
        if (this._isWaiting() || this._modalOpen) return;
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
