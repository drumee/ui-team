/**
 * Reward-flow Step 3 guide controller.
 *
 * The user has already reopened the workspace they created in Step 1 (the
 * card's "Open workspace" button → Wm.loadWorkspace). This walks them to the
 * upload control INSIDE it, so the first file lands in that workspace instead
 * of wherever the desk happened to point:
 *
 *   1 folder → spotlight the whole workspace window   → user reads it, Next
 *   2 new    → spotlight the "+ New" pill             → user clicks it
 *   3 device → spotlight the "From device" row,       → user clicks it
 *              grey-out the sibling rows                → OS file picker
 *
 * The upload itself finishes the flow through RADIO_MEDIA `_e.uploaded`, which
 * the orchestrator already listens to.
 *
 * Back exits the walkthrough to the Step 3 card and leaves the workspace open.
 * Deliberately simpler than Step 1's step-back, which drives the desk's addmenu
 * part through the orchestrator: the equivalent here means reaching into
 * window_folder's `new-ctrl` part, and there is nothing destructive to undo.
 */
const { GuideCore, hasDom, firstVisible } = require("./guide-core");

// Live workspace-window selectors. Single source of truth for what this guide
// reaches into — see window/skeleton/toolkit/index.js, which builds them.
const SEL = {
  // The window ROOT (__ui) carries the background and rounding; __main is an
  // inner box. Same rationale as Step 1's formCard.
  folder: ".window-folder__ui",
  // The merged "+ New" pill. It renders with data-visible="0" until
  // syncNewCtrlVisibility() confirms canUpload() on the Files tab, and the skin
  // hides it with display:none — so visible() correctly reports false while the
  // privilege is still resolving, and for a view-only member it never appears.
  newCtrl: ".window-folder-topbar__new-ctrl",
  // First row of its dropdown, service _e.upload.
  fromDevice: ".window-button__dropdown-menu__item--from-device",
  // Every other row in that dropdown, greyed while "device" is active.
  otherItems:
    ".window-button__dropdown-menu__item:not(.window-button__dropdown-menu__item--from-device)",
};

const ORDER = { folder: 1, new: 2, device: 3 };

/**
 * Pure sub-step decision. Split out of the class so it can be unit-tested
 * without a DOM.
 *
 * @param {{folder: boolean, newCtrl: boolean, fromDevice: boolean,
 *          nextPressed: boolean}} s what is on screen right now
 * @returns {string|null} sub-step name, or null to HOLD the current one
 */
function resolveSub(s) {
  // An open dropdown always wins: the user is one click from the picker,
  // whether they got there through the guide or on their own.
  if (s.fromDevice) return "device";
  // The workspace window is the anchor for everything else. Without it we HOLD
  // rather than reset — the window may still be mounting, and the
  // orchestrator's open timeout owns the "it never appeared" case.
  if (!s.folder) return null;
  // The + New pill is on screen the instant the window renders, so promoting on
  // visibility alone would skip the "this is your workspace" beat in the same
  // tick. The coach's Next button is what releases it.
  if (s.nextPressed && s.newCtrl) return "new";
  return "folder";
}

function tooltipFor(sub) {
  switch (sub) {
    case "folder":
      return LOCALE.REWARD_FLOW_GUIDE_FOLDER
        || "This is your workspace. Everything you upload here stays with your team.";
    case "new":
      return LOCALE.REWARD_FLOW_GUIDE_NEW || 'Click “+ New” to add your first file.';
    case "device":
      return LOCALE.REWARD_FLOW_GUIDE_FROM_DEVICE
        || 'Choose “From device” to pick a file.';
    default:
      return "";
  }
}

class RewardUploadGuide extends GuideCore {
  constructor(ui) {
    super(ui);
    this.SEL = SEL;
    this.ORDER = ORDER;
    this.DISABLE_SUB = "device";
    this._resetState();
  }

  _resetState() {
    // Released by the coach's Next on the "folder" beat — see resolveSub.
    this._nextPressed = false;
  }

  /** The coach's Next was clicked. Only the "folder" beat has one. */
  onNext() {
    this._nextPressed = true;
    this._reconcile();
  }

  _resolveSub() {
    return resolveSub({
      folder: !!firstVisible(SEL.folder),
      newCtrl: !!firstVisible(SEL.newCtrl),
      fromDevice: !!firstVisible(SEL.fromDevice),
      nextPressed: this._nextPressed,
    });
  }

  _targetEl() {
    switch (this._sub) {
      case "device": return firstVisible(SEL.fromDevice);
      case "new": return firstVisible(SEL.newCtrl);
      case "folder": return firstVisible(SEL.folder);
      default: return null;
    }
  }

  _coachFor(sub) {
    return {
      text: tooltipFor(sub),
      // Back is offered everywhere — it exits to the Step 3 card, which is
      // always a truthful place to land: nothing here has been created yet.
      showBack: true,
      // Only the "folder" beat needs an explicit advance: every other sub-step
      // is released by the user doing the real action.
      showNext: sub === "folder",
    };
  }

  /** Back exits the walkthrough — see the class comment. */
  back() {
    if (!hasDom()) return false;
    return false;
  }
}

module.exports = { RewardUploadGuide, resolveSub, SEL, ORDER };
