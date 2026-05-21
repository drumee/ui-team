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
    // Base jitsi class doesn't subscribe to "conference" — without this,
    // conference.broadcast messages (MEETING_END, HOST_HELLO) bypass us.
    this.bindEvent("conference");

    if (!this.mget(_a.nid) && this.mget(_a.room_id))
      this.mset({ nid: this.mget(_a.room_id) });
    this.isVideo = this.mget(_a.video);
    this.statusMessages = {
      ...this.statusMessages,
      waiting: LOCALE.WAITING_FOR_ATTENDEES,
    };
    this.state = "initialize";
    this._memberCallStates = new Map();
    // Maps drumate uid → 1 for participants whose hand is raised or who
    // are currently presenting. Populated by hand-raise broadcasts and the
    // screen-share lifecycle hooks below. The dashboard / attendees cards
    // read these via `_meetingUi` to render badges and the self-actions.
    this._memberHandRaised = new Map();
    this._memberPresenting = new Map();
    // presenterId is participant_id (jitsi), but the dashboard cards are
    // keyed by drumate uid. Remember the presenter's uid separately so we
    // can clear `_memberPresenting` on STOP_REMOTE_SCREEN, by which time
    // `presenterId` has already been nulled by the base class.
    this._currentPresenterUid = null;

    if (this.mget("_meeting_standalone") && typeof this._setSize === "function") {
      this._setSize({
        width: this.mget("width") || 960,
        height: this.mget("height") || 600,
        minWidth: 480,
        minHeight: 360,
      });
    }

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

  // Embedded meeting: skip the base TweenMax window resize on screen-share;
  // CSS owns the layout, only flip data-mode.
  fitScreenSize(mode) {
    if (this.el) this.el.dataset.mode = mode;
    if (this.responsive) this.responsive(mode);
  }

  change_size(cmd, max_size) {
    const mode = (this.el && this.el.dataset.mode) || "normal";
    if (this.responsive) this.responsive(mode);
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
    // sendRoomInfo doesn't forward the host record to non-host clients;
    // the host self-announces via HOST_HELLO below.
    this._isHost = !!(room.user && room.user.role === "host");
    if (this._isHost) {
      this._hostName = (Visitor.fullname && Visitor.fullname())
        || `${(Visitor.firstname && Visitor.firstname()) || ""} ${(Visitor.lastname && Visitor.lastname()) || ""}`.trim()
        || "";
    }

    this.feed(require("./skeleton")(this, room.user));
    await this.prepareConference(room);
    this.responsive();
    this.ensurePart("commands").then((p) => {
      p.el.show();
    });
    this._renderHostLabel();
    this._announceHostIfNeeded();
    if (this.el) this.el.dataset.ready = "1";
    this._meetingStartedAt = Date.now();
    this._maxParticipants = 1;
    this._postMeetingSystemMessage("meeting.start");
  }

  _announceHostIfNeeded() {
    if (!this._isHost || !this._hostName) return;
    try {
      this.sendRoomSignaling(SERVICE.conference.broadcast, {
        event: "HOST_HELLO",
        payload: {
          room_id: this.mget(_a.room_id),
          host_name: this._hostName,
        },
      });
    } catch (e) { }
  }

  _renderHostLabel() {
    if (!this._hostName) return;
    this.ensurePart("host-label").then((p) => {
      if (!p || !p.el) return;
      const label = (LOCALE.HOSTED_BY || "Hosted by {0}").replace("{0}", this._hostName);
      p.el.textContent = label;
      p.el.dataset.state = 1;
    });
  }

  onBeforeDestroy() {
    // Covers teardown paths that bypass _closeFeedbackAndLeave (tab close,
    // error teardown). _meetingEndedBroadcast keeps it idempotent.
    if (this._isHost && !this._meetingEndedBroadcast && !this._meetingEndedRemote) {
      this._meetingEndedBroadcast = 1;
      try {
        this.sendRoomSignaling(SERVICE.conference.broadcast, {
          event: "MEETING_END",
          payload: { room_id: this.mget(_a.room_id) },
        });
      } catch (e) { }
    }
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

  onWsMessage(service, data, options = {}) {
    if (options.service === SERVICE.conference.broadcast) {
      const sameRoom = !data || !data.room_id || data.room_id === this.mget(_a.room_id);
      if (sameRoom && options.event === "MEETING_END") {
        if (!this._isHost) this._handleRemoteMeetingEnd();
        return;
      }
      if (sameRoom && options.event === "HOST_HELLO") {
        if (data && data.host_name && !this._isHost) {
          this._hostName = data.host_name;
          this._renderHostLabel();
        }
        return;
      }
      if (sameRoom && options.event === "HAND_RAISE") {
        this._applyRemoteHandRaise(data);
        return;
      }
    }
    if (super.onWsMessage) return super.onWsMessage(service, data, options);
  }

  _handleRemoteMeetingEnd() {
    if (this._meetingEndedRemote) return;
    this._meetingEndedRemote = 1;
    try {
      Wm.alert(LOCALE.MEETING_ENDED_BY_HOST || "Meeting ended by host");
    } catch (e) { }
    this._closeFeedbackAndLeave();
  }

  async onRemoteDrumateJoined(data) {
    if (super.onRemoteDrumateJoined) await super.onRemoteDrumateJoined(data);
    // Re-announce so late joiners learn who hosts.
    if (this._isHost) this._announceHostIfNeeded();
    const id = data && (data.drumate_id || data.uid || data.entity_id);
    if (id) this._markMemberJoined(id);
  }

  _markMemberJoined(drumate_id) {
    if (!this._memberCallStates) this._memberCallStates = new Map();
    this._memberCallStates.set(String(drumate_id), "joined");
    this._refreshDashboard();
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
        if (this._isHost) {
          this._showFeedbackPopup();
        } else {
          this._closeFeedbackAndLeave();
        }
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

      case "toggle-dashboard":
        this._toggleDashboard();
        break;

      case "call-member":
        this._inviteToRoom(cmd.getAttr());
        break;

      case "hand-raise":
        this._toggleHandRaise(cmd);
        break;

      case "lower-hand-self":
        this._lowerOwnHand();
        break;

      case "stop-share-self":
        this._stopOwnPresentation();
        break;

      case "pin-tile":
        this._togglePinnedTile(args);
        break;

      default:
        super.onUiEvent(cmd, args);
    }
  }

  // participant_id (jitsi) -> drumate uid. The dashboard cards are keyed
  // by uid, and HAND_RAISE/screen-share events carry participant_id, so
  // every state map update goes through this. Returns null for the local
  // user's own participant id (we don't store ourselves in this.endpoints).
  _uidForParticipant(pid) {
    if (!pid || !this.endpoints) return null;
    const ep = this.endpoints[pid];
    if (!ep || ep.isDestroyed()) return null;
    return ep.mget && ep.mget(_a.uid);
  }

  _setMemberHandRaised(uid, on) {
    if (!uid) return;
    const key = String(uid);
    if (on) this._memberHandRaised.set(key, 1);
    else this._memberHandRaised.delete(key);
    this._applyTileDataset(uid, "raised", on);
    this._refreshDashboard();
  }

  _setMemberPresenting(uid, on) {
    if (!uid) return;
    const key = String(uid);
    if (on) this._memberPresenting.set(key, 1);
    else this._memberPresenting.delete(key);
    this._applyTileDataset(uid, "presenting", on);
    this._refreshDashboard();
  }

  // Flip a data-attr on the video tile so the tile skin shows the
  // corresponding badge. Handles both local (own visitor id) and remote
  // tiles. Safe to call before the tile exists — the next render reads
  // the same state maps and applies the attr.
  _applyTileDataset(uid, attr, on) {
    if (!uid || !attr) return;
    const value = on ? 1 : 0;
    if (String(uid) === String(Visitor.id)) {
      if (typeof this.getLocalParts !== "function") return;
      this.getLocalParts().then((parts) => {
        if (parts && parts.local && parts.local.el && !parts.local.isDestroyed()) {
          parts.local.el.dataset[attr] = value;
        }
      }).catch(() => { /* local tile not ready yet — next render will pick up */ });
      return;
    }
    if (!this.endpoints) return;
    for (const pid of Object.keys(this.endpoints)) {
      const ep = this.endpoints[pid];
      if (!ep || ep.isDestroyed()) continue;
      if (String(ep.mget(_a.uid)) !== String(uid)) continue;
      if (ep.el) ep.el.dataset[attr] = value;
      break;
    }
  }

  // Toggle pin on a participant's tile. Only one pinned tile at a time —
  // clicking pin on a different participant moves the spotlight; clicking
  // again on the same one un-pins. The visible effect is driven by
  // CSS rules keyed on data-pinned (on the tile root) and data-pinned-mode
  // (on the meeting window root), which scale the pinned tile up and
  // switch __endpoints into presenter mode so __participants becomes a
  // sidebar — even when no one is sharing screen.
  _togglePinnedTile(args) {
    const pid = args && args.participant_id;
    if (!pid) return;
    const wasSame = this._pinnedParticipantId === pid;
    // Clear previous pin (if any) before setting the new one.
    if (this._pinnedParticipantId) {
      const prev = this._tileForPin(this._pinnedParticipantId, this._pinnedIsLocal);
      if (prev && prev.el) prev.el.dataset.pinned = 0;
    }
    if (wasSame) {
      this._pinnedParticipantId = null;
      this._pinnedIsLocal = false;
      if (this.el) this.el.dataset["pinned-mode"] = 0;
      // Drop back to whatever mode the screen-share state would dictate.
      if (this.responsive) this.responsive(this.isScreenShare ? "presenter" : "normal");
      return;
    }
    this._pinnedParticipantId = pid;
    this._pinnedIsLocal = !!(args && args.isLocal);
    const tile = this._tileForPin(pid, this._pinnedIsLocal);
    if (tile && tile.el) tile.el.dataset.pinned = 1;
    if (this.el) this.el.dataset["pinned-mode"] = 1;
    // Force presenter mode so the participants column shrinks to a sidebar
    // even if no screen-share is active.
    if (this.responsive) this.responsive("presenter");
  }

  // Resolve a tile widget for the pin highlight. Local tile lives in
  // __participants alongside remote tiles; remote tiles are indexed by
  // participant_id in `this.endpoints`. Local has no entry there so we
  // walk the children to find the endpoint_local kind.
  _tileForPin(pid, isLocal) {
    if (!isLocal && this.endpoints && this.endpoints[pid]) {
      const ep = this.endpoints[pid];
      if (ep && !ep.isDestroyed()) return ep;
    }
    if (this.__participants && this.__participants.children) {
      const list = this.__participants.children.toArray
        ? this.__participants.children.toArray()
        : [];
      for (const c of list) {
        if (c.isDestroyed && c.isDestroyed()) continue;
        if (isLocal && c.kind === "endpoint_local") return c;
        if (!isLocal && c.mget && c.mget("participant_id") === pid) return c;
      }
    }
    return null;
  }

  _applyRemoteHandRaise(data) {
    if (!data) return;
    const pid = data.participant_id;
    if (!pid || !this.endpoints) return;
    const endpoint = this.endpoints[pid];
    if (!endpoint || endpoint.isDestroyed() || !endpoint.el) return;
    endpoint.el.dataset.raised = data.state ? 1 : 0;
    const uid = (data.uid != null) ? data.uid : this._uidForParticipant(pid);
    this._setMemberHandRaised(uid, !!data.state);
  }

  _toggleHandRaise(cmd) {
    const raised = cmd.el.dataset.raised === "1" ? 0 : 1;
    cmd.el.dataset.raised = raised;
    if (cmd.el) {
      cmd.el.setAttribute("title", raised ? (LOCALE.LOWER_HAND || "Lower hand") : (LOCALE.RAISE_HAND || "Raise hand"));
    }
    // Mirror the new state for the local user on the dashboard card. The
    // broadcast below tells other peers; this updates our own UI.
    this._setMemberHandRaised(Visitor.id, !!raised);
    try {
      this.sendRoomSignaling(SERVICE.conference.broadcast, {
        event: "HAND_RAISE",
        payload: {
          room_id: this.mget(_a.room_id),
          participant_id: this.room && this.room.myUserId && this.room.myUserId(),
          uid: Visitor.id,
          state: raised,
        },
      });
    } catch (e) {
      if (this.warn) this.warn("hand-raise broadcast failed", e);
    }
  }

  // Triggered from a member card's "Lower hand" action. The local
  // raise-hand button lives in __ctrlHandRaise (the top-bar control); we
  // toggle through it so its dataset and the broadcast payload stay in
  // sync with `_toggleHandRaise` above.
  _lowerOwnHand() {
    const cmd = this.__ctrlHandRaise;
    if (!cmd || !cmd.el) {
      this._setMemberHandRaised(Visitor.id, false);
      return;
    }
    if (cmd.el.dataset.raised !== "1") return;
    this._toggleHandRaise(cmd);
  }

  // Triggered from the local member card's "Stop sharing" action. Defers
  // to the inherited stopPresentation() which already publishes the
  // STOP_REMOTE_SCREEN broadcast.
  _stopOwnPresentation() {
    if (typeof this.stopPresentation === "function") {
      try { this.stopPresentation(); } catch (e) { if (this.warn) this.warn(e); }
    }
    this._setMemberPresenting(Visitor.id, false);
  }

  // Override: remote user just started screen sharing. The base impl
  // sets `this.presenterId = data.id` before invoking this; we capture
  // the corresponding uid so STOP_REMOTE_SCREEN (which nulls presenterId
  // before calling onRemoteScreenStop) can still clear the right entry.
  prepareRemoteScreen(args) {
    if (super.prepareRemoteScreen) super.prepareRemoteScreen(args);
    const uid = (args && args.uid) || this._uidForParticipant(args && args.id);
    if (uid) {
      this._currentPresenterUid = String(uid);
      this._setMemberPresenting(uid, true);
    }
  }

  onRemoteScreenStop() {
    if (super.onRemoteScreenStop) super.onRemoteScreenStop();
    if (this._currentPresenterUid) {
      this._setMemberPresenting(this._currentPresenterUid, false);
      this._currentPresenterUid = null;
    }
  }

  // Local desktop track mute/unmute is the only signal we get for our own
  // share lifecycle (we don't receive our own START/STOP broadcast). Hook
  // it to mirror the same uid-keyed state the dashboard reads.
  onTrackMuteChange(track) {
    if (super.onTrackMuteChange) super.onTrackMuteChange(track);
    if (!track || typeof track.getType !== "function") return;
    if (track.getType() !== _a.video) return;
    if (typeof track.getVideoType !== "function") return;
    if (track.getVideoType() !== _a.desktop) return;
    this._setMemberPresenting(Visitor.id, !track.isMuted());
  }

  async _toggleDashboard() {
    const wrap = await this.ensurePart("wrapper-dashboard");
    if (!wrap) return;
    if (this._dashboardOpen) {
      wrap.clear();
      this._dashboardOpen = false;
      return;
    }
    wrap.feed(require("./skeleton/dashboard")(this));
    this._dashboardOpen = true;
  }

  async _inviteToRoom(callee) {
    if (!callee) return;
    const guest_id = callee.drumate_id || callee.entity_id || callee.uid || callee.id;
    if (!guest_id) return;
    const key = String(guest_id);
    const state = this._memberCallStates && this._memberCallStates.get(key);
    if (state === "calling" || state === "joined") return;
    if (!this._memberCallStates) this._memberCallStates = new Map();
    this._memberCallStates.set(key, "calling");
    this._refreshDashboard();
    try {
      await this.sendRoomSignaling(SERVICE.conference.invite, { guest_id });
    } catch (e) {
      this._memberCallStates.delete(key);
      this._refreshDashboard();
      if (this.warn) this.warn("conference.invite failed", e);
    }
  }

  _refreshDashboard() {
    if (!this._dashboardOpen) return;
    const wrap = this.getPart && this.getPart("wrapper-dashboard");
    if (wrap && wrap.feed) wrap.feed(require("./skeleton/dashboard")(this));
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
    // Host leaving ends the meeting for everyone else; non-host leaves
    // don't broadcast so the rest of the room stays open.
    if (this._isHost && !this._meetingEndedBroadcast && !this._meetingEndedRemote) {
      this._meetingEndedBroadcast = 1;
      try {
        this.sendRoomSignaling(SERVICE.conference.broadcast, {
          event: "MEETING_END",
          payload: { room_id: this.mget(_a.room_id) },
        });
      } catch (e) { }
    }
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
