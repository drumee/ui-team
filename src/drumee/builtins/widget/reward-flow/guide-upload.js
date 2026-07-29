/**
 * Reward-flow Step 3 guide controller.
 *
 * The user has already reopened the workspace they created in Step 1 (the
 * card's "Open workspace" button → Wm.loadWorkspace). This walks them to the
 * upload control INSIDE it, so the first file lands in that workspace instead
 * of wherever the desk happened to point:
 *
 *   1 folder    → spotlight the whole workspace window → user reads it, Next
 *   2 new       → spotlight the "+ New" pill          → user clicks it
 *   3 device    → spotlight the "From device" row,    → user clicks it
 *                 grey-out the sibling rows             → OS file picker
 *   4 uploading → spotlight the upload-progress window → RADIO_MEDIA
 *                                                        `_e.uploaded`
 *   5 files     → spotlight the workspace's files panel, where what they just
 *                 uploaded now sits  → user reads it, Next → congrats
 *
 * The last two beats are what the upload turned into: the orchestrator used to
 * jump straight from `_e.uploaded` to the congrats modal, which threw the
 * workspace away in the same frame the first file landed in it — the user never
 * saw the thing the whole walkthrough was for.
 *
 * Every beat offers Back, and it does the same thing on all five: exits the
 * walkthrough to the Step 3 card, workspace left open. Deliberately simpler than
 * Step 1's step-back, which walks its sub-steps in reverse by driving the desk's
 * addmenu part through the orchestrator: the equivalent here means reaching into
 * window_folder's `new-ctrl` part, and there is nothing destructive to undo.
 * The orchestrator does that directly in its `reward-back` case and never
 * consults back(), so this guide just inherits GuideCore's, which returns false.
 */
const { GuideCore, firstVisible } = require("./guide-core");

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
  // The upload-progress window, which mounts as soon as the picker hands its
  // files over. Root (__ui) again, for the same reason as `folder`.
  uploader: ".window-upload-progress__ui",
  // The workspace's file listing — the grid and the row view build the same
  // class (see window/skeleton/toolkit filesContainer /
  // folderFilesRowContainer), so this points at whichever the user is in.
  filesPanel: ".window-folder__files-panel",
};

const ORDER = { folder: 1, new: 2, device: 3, uploading: 4, files: 5 };

/**
 * Pure sub-step decision. Split out of the class so it can be unit-tested
 * without a DOM.
 *
 * @param {{folder: boolean, newCtrl: boolean, fromDevice: boolean,
 *          nextPressed: boolean, uploading: boolean, uploaded: boolean,
 *          filesPanel: boolean}} s what is on screen right now
 * @returns {string|null} sub-step name, or null to HOLD the current one
 */
function resolveSub(s) {
  // The upload has landed: the only thing left is to show the user their files.
  // HOLD rather than fall through when the panel is not on screen — they may
  // have flipped to another tab of the window, and rewinding a finished
  // walkthrough to "click + New" would be nonsense. It resolves the moment they
  // come back.
  if (s.uploaded) return s.filesPanel ? "files" : null;
  // Files are in flight. Ahead of the dropdown check below because the picker
  // can leave its dropdown on screen behind the progress window.
  if (s.uploading) return "uploading";
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
    case "uploading":
      return LOCALE.REWARD_FLOW_GUIDE_UPLOADING
        || "Uploading your files — hang on a moment.";
    case "files":
      return LOCALE.REWARD_FLOW_GUIDE_FILES
        || "Here are your files, safe in your workspace.";
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
    // Latched by onUploaded: a file has actually landed. Not read from the DOM
    // because nothing on screen says "an upload succeeded" — the progress window
    // looks much the same mid-flight as it does when it is done.
    this._uploaded = false;
  }

  /**
   * The coach's Next was clicked. Two beats carry one:
   *   folder → release the "read this" beat and walk on to "+ New";
   *   files  → the walkthrough is over, hand back to the orchestrator for the
   *            congrats modal. Nothing here to reconcile afterwards.
   */
  onNext() {
    if (this._sub === "files") {
      // Files still going up — the button is rendered disabled (see _coachFor),
      // so this only catches an activation that reached us another way.
      if (this._uploadPending()) return;
      if (typeof this._ui?.onUploadGuideComplete === "function") {
        this._ui.onUploadGuideComplete();
      }
      return;
    }
    this._nextPressed = true;
    this._reconcile();
  }

  /** A file finished uploading (the orchestrator's RADIO_MEDIA `_e.uploaded`).
   *  Moves the walkthrough onto its last beat, where the files panel that now
   *  holds it is spotlighted. */
  onUploaded() {
    this._uploaded = true;
    this._reconcile();
  }

  /**
   * Files are still going up.
   *
   * `_e.uploaded` fires per FILE, so the "files" beat is reached as soon as the
   * first one lands — with the rest still in flight and the progress window
   * still on screen. That window going is what says the batch is done.
   */
  _uploadPending() {
    return !!firstVisible(SEL.uploader);
  }

  _resolveSub() {
    return resolveSub({
      folder: !!firstVisible(SEL.folder),
      newCtrl: !!firstVisible(SEL.newCtrl),
      fromDevice: !!firstVisible(SEL.fromDevice),
      nextPressed: this._nextPressed,
      uploading: !!firstVisible(SEL.uploader),
      uploaded: this._uploaded,
      filesPanel: !!firstVisible(SEL.filesPanel),
    });
  }

  _targetEl() {
    switch (this._sub) {
      // While the batch is still going up, spotlight the PROGRESS WINDOW rather
      // than the panel: it is what the user is waiting on, it is what their
      // remaining files are in, and the cutout can only clear one thing at a
      // time. It hands over to the panel as the last file lands.
      case "files":
        return (this._uploadPending() && firstVisible(SEL.uploader))
          || firstVisible(SEL.filesPanel);
      case "uploading": return firstVisible(SEL.uploader);
      case "device": return firstVisible(SEL.fromDevice);
      case "new": return firstVisible(SEL.newCtrl);
      case "folder": return firstVisible(SEL.folder);
      default: return null;
    }
  }

  _coachFor(sub) {
    // The last beat, with the batch still going up — the sub-step that
    // spotlights the progress window instead of the panel (see _targetEl).
    const pending = sub === "files" && this._uploadPending();
    return {
      text: tooltipFor(sub),
      // EVERY beat offers Back. It exits the walkthrough to the Step 3 card
      // with the workspace left open (the orchestrator's reward-back), which is
      // a way out of all five — including the two that used to withhold it
      // because the upload had already happened by then. Nothing about those
      // beats is undone by leaving: the files stay uploaded, the card offers
      // "Open workspace" again, and re-entering restarts the walkthrough from
      // the top. A beat the user cannot leave is worse than one that lands them
      // somewhere slightly ahead of themselves.
      showBack: true,
      // Beats that ask the user to READ need an explicit advance; every other
      // sub-step is released by the user doing the real action. "files" is the
      // last one, so its Next ends the walkthrough (see onNext).
      showNext: sub === "folder" || sub === "files",
      // …but not yet, while the batch is still uploading. Ending the walkthrough
      // there tears the workspace down (congrats closes it) with files still
      // going up into it. Shown-but-disabled rather than hidden, so the way out
      // stays where the user is already looking for it.
      nextDisabled: pending,
      // Sit the callout ABOVE that progress window. It is docked bottom-right,
      // so the default "below if it fits" tucks the coach into the corner under
      // it, and when it does not fit the coach lands over the very rows the user
      // is watching tick along.
      above: pending,
      // "folder" alone dims the whole screen and shows only the coach: cutting
      // the workspace window out would leave it fully lit, and since it fills
      // the viewport nothing would be dimmed at all. Every other beat — the
      // files panel included — points at something smaller than the window, so
      // it gets a real hole.
      hole: sub !== "folder",
    };
  }
}

module.exports = { RewardUploadGuide, resolveSub, SEL, ORDER };
