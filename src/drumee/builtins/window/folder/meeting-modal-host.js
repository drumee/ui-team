// The folder's "Meeting information" modal outside the folder.
//
// The modal is not a component: it is ~80 methods of window_folder (open,
// save, delete, invitees, recurrence, files, the rich description, Join) over
// the skeleton skeleton/meeting-modal.js and the skin skin/meeting-modal.scss.
// The Personal Calendar opens it for a meeting chip without mounting a whole
// folder window — its files, chat and call side effects — by hosting it here:
//
//   • figName "window_folder", so ui.fig.family is "window-folder" and the
//     folder's skin rules (.window-folder__meeting-modal…) apply unchanged;
//   • BORROWED: the folder's own meeting methods, copied off its prototype.
//     tests/meeting-modal-host.test.js fails when one of them reaches a
//     this.x() that is neither borrowed, nor HOST_OWN, nor ui-core's;
//   • the modal's events go to the folder's onMeetingModalEvent.
//
// Options: hub_id, meeting_nid, occurrence (a recurring occurrence's own
// start, or 0), may_write. (stime / etime are the chip's, kept for context;
// the record is looked up across the whole hub.)
// Emits `meeting-host-closed` { wrote } exactly once, however the modal goes.
const WindowFolder = require("./index");

// room_list_scheduled's INT(11) ceiling: with stime 0 it is "all time".
const ALL_TIME_END = 2147483647;

const BORROWED = [
  // Called by the modal's skeleton (ui.meetingCreator), not by a method:
  // tests/meeting-modal-host.test.js checks the skeleton's ui.x() calls too.
  "meetingCreator",
  "_addInvitee", "_applyMeetingTileState", "_applyStartBtnState",
  "_awaitMeetingReady", "_checkAvailability", "_filterInvitees",
  "_installInviteeFocus", "_installMeetingFiles", "_launchMeetingStandalone",
  "_mayScheduleMeetings", "_meetingOverPlanCap", "_meetingScope",
  "_mmAbandonUploads", "_mmActivateAmpm", "_mmAttach", "_mmBanner",
  "_mmCloseFileResults", "_mmCloseMention", "_mmCollectMentionUids",
  "_mmDescEditorEl", "_mmDestNid", "_mmFailureMessage", "_mmFeedFileResults",
  "_mmFetchMentionFiles", "_mmGateFiles", "_mmHandleMention",
  "_mmHighlightMention", "_mmHubId", "_mmImageUrlForNid", "_mmInitDescEditor",
  "_mmInsertPastedImage", "_mmInsertPick", "_mmLinkFiles", "_mmLoadFileNames",
  "_mmMakeFileChip", "_mmMakeInlineImage", "_mmMakeMentionChip",
  "_mmMarkTitleError", "_mmOnBatchDone", "_mmOnDescInput", "_mmOnDescKeydown",
  "_mmOnDrop", "_mmOnFileDone", "_mmOnPaste", "_mmOpenFile", "_mmOpenMention",
  "_mmPickFile", "_mmPickUploads", "_mmPositionMention",
  "_mmRefusedForPrivilege", "_mmRemoveFile", "_mmRenderEditorContent",
  "_mmRenderFiles", "_mmSaveMeeting", "_mmSearchFiles", "_mmSearchInput",
  "_mmSerializeEditor", "_mmStageUploads", "_mmSucceeded", "_mmUploadFolder",
  "_mmUploadInlineImage", "_prefillMeeting", "_reFeedInviteeChips",
  "_readMeetingForm", "_recomputeTime", "_removeInvitee",
  "_sayCannotScheduleMeetings", "_setMeetingAmpm", "_setMeetingJoined",
  "_setMeetingStartLoading", "_startBtnLabel", "_stopAwaitMeetingReady",
  "_toggleInviteeList", "deleteMeetingModal", "onMeetingModalEvent",
  "openMeetingModal", "setMeetingRecur", "submitMeetingModal",
];

const HOST_OWN = [
  "initialize", "onDomRefresh", "onPartReady", "_load", "onUiEvent", "onBeforeDestroy", "_openFromList",
  "_reportClosed", "closeMeetingModal", "_refreshSchedule", "_upsertLocalMeeting",
  "canUpload", "openContent", "meetingViewOnly", "_applyViewOnly",
];

class __meeting_modal_host extends LetcBox {
  initialize(opt = {}) {
    require("./skin/meeting-modal-host");
    super.initialize(opt);
    this.declareHandlers();
    this._hostWrote = false;
    this._hostClosed = false;
    // The rich description's image paste/drop, as window_folder binds it.
    if (!this.uploadFile) {
      const { uploadFile } = require("@drumee/ui-essentials");
      this.uploadFile = uploadFile.bind(this);
    }
  }

  onDomRefresh() {
    const pfx = this.fig.family;
    // The folder's dialog slot (ensurePart("wrapper-dialog")), here a
    // full-screen centring layer over the calendar's own dimmed modal.
    this.feed(
      Skeletons.Wrapper.Y({
        className: `${pfx}__meeting-host-dialog`,
        name: "dialog",
        partHandler: this,
      }),
    );
    this._load();
  }

  onPartReady(child, pn) {
    if (pn === "wrapper-dialog") this.dialogWrapper = child;
  }

  async _load() {
    const hub_id = this.mget(_a.hub_id);
    // Join's launcher (borrowed _launchMeetingStandalone) reads the hub's home
    // off the model, as a folder window carries it.
    const home = require("libs/hub-home")
      .get(this, hub_id)
      .then((h) => {
        if (!h || typeof h !== "object") return;
        const home_id = h.home_id || h.id;
        this.model.set({
          actual_hub_id: hub_id,
          actual_home_id: home_id,
          home_id,
          nid: home_id,
          filename: h.filename || h.name,
          area: h.area,
          ownpath: h.ownpath,
        });
      })
      .catch(() => {});
    // The hub's every meeting, not a window around the chip: some stored
    // meetings end before they start (an edit moved stime, not etime), and
    // room_list_scheduled's overlap test drops those from a tight window —
    // the chip of a live meeting then said "no longer exists".
    //
    // All time is asked for EXPLICITLY. Omitting the bounds does not mean
    // "everything" on the server: its database layer turns a null into '',
    // the call fails ("Incorrect integer value: '' for column _stime") and
    // room.list swallows that into an empty list. stime 0 also keeps a
    // meeting whose stored end is before its start (COALESCE(etime) >= 0).
    // A cache-buster: a GET read right after an edit must not come stale.
    const rows = await this.fetchService({
      service: (SERVICE.room && SERVICE.room.list) || "room.list",
      hub_id,
      stime: 0,
      etime: ALL_TIME_END,
      _ts: Date.now(),
    });
    await home;
    if (this.isDestroyed && this.isDestroyed()) return;
    this._openFromList(rows);
  }

  /** Open the record this host was mounted for, or say it is gone. */
  _openFromList(rows) {
    const list = Array.isArray(rows) ? rows : rows && rows.id ? [rows] : [];
    const nid = String(this.mget("meeting_nid") || "");
    const meeting = list.find((r) => r && String(r.id) === nid);
    if (!meeting) {
      if (typeof Butler !== "undefined") Butler.say(LOCALE.MEETING_NOT_FOUND);
      return this._reportClosed();
    }
    // Whatever fails opening it must not strand the calendar's backdrop with
    // no card on it: say it in the log, and hand the close back.
    return Promise.resolve()
      .then(() =>
        this.openMeetingModal({
          meeting,
          occurrence: Number(this.mget("occurrence")) || null,
        }),
      )
      .then(() => this._applyViewOnly())
      .catch((e) => {
        this.warn("meeting_modal_host: the modal failed to open", e);
        this._reportClosed();
      });
  }

  onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.service || (cmd.mget && cmd.mget(_a.service));
    const r = this.onMeetingModalEvent(service, cmd, args);
    if (r.handled) return r.result;
  }

  // ── the folder's hooks, answered for a host ───────────────────────────────

  /**
   * The folder's close, then tell the calendar — on the next tick, because the
   * folder closes BEFORE what follows: a save runs _refreshSchedule after it
   * (the write must be counted), and Join launches the call after it (the
   * calendar must not tear this host down first).
   */
  closeMeetingModal() {
    WindowFolder.prototype.closeMeetingModal.call(this);
    setTimeout(() => this._reportClosed(), 0);
  }

  _reportClosed() {
    if (this._hostClosed) return;
    this._hostClosed = true;
    this.triggerHandlers({ service: "meeting-host-closed", wrote: !!this._hostWrote });
  }

  /** The folder repaints its Meet tab after every write; here, the write is counted. */
  _refreshSchedule() {
    this._hostWrote = true;
    return Promise.resolve();
  }

  /** The folder's Meet-tab cache; there is none here. */
  _upsertLocalMeeting() {}

  /**
   * The modal's view mode (skeleton meetingModal): the viewer did not report
   * this meeting. may_write is the calendar row's can_write, which the server
   * answers as created_by === caller.
   */
  meetingViewOnly() {
    return !this.mget("may_write");
  }

  /**
   * In view mode, once the modal is drawn: every field read-only (the skin
   * already takes the clicks), the description not editable — so the
   * keyboard cannot edit what the mouse cannot.
   */
  _applyViewOnly() {
    if (!this.meetingViewOnly()) return;
    const root = this.dialogWrapper && this.dialogWrapper.el;
    if (!root) return;
    root.querySelectorAll("input, textarea").forEach((el) => {
      el.readOnly = true;
    });
    root.querySelectorAll("[contenteditable]").forEach((el) => {
      el.setAttribute("contenteditable", "false");
    });
  }

  /** The folder reads the viewer's privilege; the calendar row's own answer. */
  canUpload() {
    return !!this.mget("may_write");
  }

  /** A file chip opens its file through the window manager. */
  openContent(media, args) {
    return Wm.openContent(media, args);
  }

  onBeforeDestroy() {
    // Escape, or any close the calendar makes, destroys the host without the
    // folder's close: run its teardown now (invitee blur timer, uploads still
    // running, the dialog), and report nothing — the calendar is the closer.
    this._hostClosed = true;
    WindowFolder.prototype.closeMeetingModal.call(this);
  }
}

__meeting_modal_host.prototype.figName = "window_folder";
for (const name of BORROWED) {
  __meeting_modal_host.prototype[name] = WindowFolder.prototype[name];
}

module.exports = __meeting_modal_host;
