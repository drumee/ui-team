const __room = require("builtins/webrtc/room/jitsi");

class __window_meeting extends __room {
  /**
   *
   * @param {*} opt
   */
  initialize(opt = {}) {
    require("./skin");
    this.service_class = "meeting";
    super.initialize(opt);
    this.model.atLeast({
      header: 1,
      resizable: 1,
    });
    this._configs = {};
    this.model.set({
      video: 0,
      audio: 1,
      service_class: this.service_class,
    });
    this.declareHandlers();
    if (!this.mget(_a.nid) && this.mget(_a.room_id))
      this.mset({ nid: this.mget(_a.room_id) });
    this.isVideo = this.mget(_a.video);
    this.statusMessages = {
      ...this.statusMessages,
      waiting: LOCALE.WAITING_FOR_ATTENDEES,
    };
    this.state = "initialize";
    this.once("user-left", (id) => {
      if (this.__participants.collection.length > 2) {
        this.stateMessage();
      } else {
        this.stateMessage("waiting");
      }
    });
  }

  /**
   *
   * @param {*} e
   * @param {*} ui
   * @param {*} anim
   */
  _resize(e, ui, anim) {
    this.responsive();
    super._resize(e, ui, anim);
  }

  /**
   *
   * @returns
   */
  contextmenuItems() {
    if (this.mget(_a.room_id)) return [_a.link];
    return null;
  }

  /**
   *
   */
  async onDomRefresh() {
    this.raise();
    if (this.el) this.el.dataset.ready = "0";
    this.feed(require("./skeleton/init")(this));
    this.stateMachine("initializing");
    let room = await this.join();
    if (!room || !room.user) {
      if (this.el) this.el.dataset.ready = "1";
      this.stateMachine("permissionDenied");
      return;
    }
    this.feed(require("./skeleton")(this, room.user));
    await this.prepareConference(room);
    this.responsive();
    this.ensurePart("commands").then((p) => {
      p.el.show();
    });
    if (this.el) this.el.dataset.ready = "1";
    this._meetingStartedAt = Date.now();
    this._maxParticipants = 1;
    this._postMeetingSystemMessage("meeting.start");
  }

  onBeforeDestroy() {
    this._postMeetingSystemMessage("meeting.end");
    if (super.onBeforeDestroy) super.onBeforeDestroy();
  }

  /**
   * Post a "X started/ended a meeting" system message into the folder's chat
   * so members discover the meeting from chat history. The backend doesn't
   * preserve custom `message_type`/`metadata` fields on regular channel.post,
   * so we encode the payload into the `message` field with a sentinel prefix
   * (`[[MEETING:start:{json}]]`) which chat-item parses on render.
   * Skipped on DMZ rooms (no chat channel) and when nid is missing.
   */
  _postMeetingSystemMessage(type) {
    if (this.mget(_a.area) === _a.dmz) return;
    const hub_id = this.mget(_a.hub_id);
    const nid = this.mget(_a.nid) || this.mget(_a.actual_home_id);
    if (!hub_id || !nid) return;
    if (type === "meeting.start" && this._meetingMessagePosted) return;
    if (type === "meeting.start") this._meetingMessagePosted = true;

    const payload = {
      hub_id,
      nid,
      room_id: this.mget(_a.room_id) || nid,
      filename: this.mget(_a.filename),
      by: (Visitor.fullname && Visitor.fullname()) || "",
    };
    const action = type === "meeting.start" ? "start" : "end";
    const message = `[[MEETING:${action}:${JSON.stringify(payload)}]]`;

    try {
      this.postService({
        service: SERVICE.channel.post,
        hub_id,
        nid,
        message,
      });
    } catch (e) {
      if (this.warn) this.warn("Failed to post meeting system message", e);
    }
  }

  /**
   *
   * @param {*} data
   * @returns
   */
  async onSignalingMessage(data) {
    switch (data.type) {
      case "meeting.start":
        if (this.isPresenter()) return;
        if (
          data.endpointAddress &&
          data.endpointAddress == Visitor.get(_a.endpointAddress)
        )
          return;
        await uiRouter.ensureWebsocket();
        await this.getRoomInfo();
    }
  }

  /**
   *
   */
  onUiEvent(cmd, args = {}) {
    let service = args.service || cmd.get(_a.service);
    if (!service) return;
    switch (service) {
      case _a.close:
        this.warning(require("./skeleton/confirm")(this, null));
        break;

      case _a.invite:
        if (typeof cmd.callInitiated === "function") cmd.callInitiated();
        this.postService(SERVICE.hub.poke, {
          hub_id: this.mget(_a.hub_id),
          uid: cmd.mget(_a.user_id),
          kind: this.mget(_a.kind),
          nid: this.mget(_a.room_id),
        });
        break;

      case "close-dialog":
        this.warning();
        this.__wrapperOverlay.clear();
        this._showFeedbackPopup();
        break;

      case "cancel-dialog":
        this.warning();
        this.__wrapperOverlay.clear();
        break;

      case "leave-meeting":
        this._showFeedbackPopup();
        break;

      case "rate-meeting":
        this._setRating(cmd);
        break;

      case "feedback-skip":
      case "feedback-submit":
        if (service === "feedback-submit") this._captureFeedback();
        this._closeFeedbackAndLeave();
        break;

      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
   * Mount the post-meeting feedback popup at the Wm-level wrapper-modal slot
   * (top of the desk shell) so the blurred backdrop covers the entire app
   * — including the left sidebar — and the card lands centered on screen
   * regardless of where window_meeting is embedded.
   * Skip the popup when the meeting never actually joined (permissionDenied).
   */
  _showFeedbackPopup() {
    if (this._feedbackShown) return;
    this._feedbackShown = true;
    if (!this._meetingStartedAt) {
      return this._closeFeedbackAndLeave();
    }
    const elapsed = Math.max(0, Math.floor((Date.now() - this._meetingStartedAt) / 1000));
    const m = Math.floor(elapsed / 60);
    const s = elapsed % 60;
    const duration = `${m}:${String(s).padStart(2, "0")}`;
    const participantCount = (this.__participants && this.__participants.collection)
      ? Math.max(this._maxParticipants || 0, this.__participants.collection.length)
      : (this._maxParticipants || 1);

    this._feedback = { rating: 0, comment: "" };
    Wm.ensurePart("wrapper-modal").then((modal) => {
      if (!modal) return this._closeFeedbackAndLeave();
      this._feedbackModal = modal;
      modal.feed(require("./skeleton/feedback")(this, {
        duration,
        participantCount,
      }));
    });
  }

  /** Visually highlight stars 1..N when a star is clicked. */
  _setRating(cmd) {
    if (!cmd || !cmd.el) return;
    const rating = parseInt(cmd.el.dataset.rating, 10) || 0;
    if (!this._feedback) this._feedback = {};
    this._feedback.rating = rating;
    for (let i = 1; i <= 5; i++) {
      this.ensurePart(`feedback-star-${i}`).then((star) => {
        if (star && star.el) star.el.dataset.on = i <= rating ? "1" : "0";
      });
    }
  }

  /** Pull the comment textarea content into _feedback (frontend-only). */
  _captureFeedback() {
    const part = this.getPart && this.getPart("feedback-comment");
    const el = part && part.el && part.el.querySelector("textarea, input");
    if (el) this._feedback.comment = (el.value || "").trim();
    if (this.verbose) {
      this.verbose("[meeting-feedback]", {
        rating: (this._feedback && this._feedback.rating) || 0,
        comment: (this._feedback && this._feedback.comment) || "",
        room_id: this.mget(_a.room_id),
        hub_id: this.mget(_a.hub_id),
      });
    }
  }

  _closeFeedbackAndLeave() {
    if (this._feedbackModal && this._feedbackModal.clear) {
      this._feedbackModal.clear();
      this._feedbackModal = null;
    }
    this.triggerHandlers({ service: "leave-meeting" });
    this.goodbye();
  }

  stateMessage(s, timeout) {
    const preJoinStates = [
      "initializing",
      "joining",
      "getUserDevices",
      "permissionDenied",
    ];
    if (!s || !preJoinStates.includes(s)) {
      return super.stateMessage(s, timeout);
    }
    const message = this.statusMessages[s] || s;
    this.ensurePart("message-container").then((c) => {
      c.feed([
        Skeletons.Note({ className: "message-text", content: message }),
      ]);
    });
  }

  /**
   *
   */
  membersListApi() {
    if (this.mget(_a.area) == _a.dmz) return null;
    return {
      service: SERVICE.hub.get_members_by_type,
      type: "all",
      hub_id: this.mget(_a.hub_id),
      timer: 500,
    };
  }
}

//__window_meeting.initClass();

module.exports = __window_meeting;
