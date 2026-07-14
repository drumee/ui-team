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
    // While a presenter video is fullscreen, the browser owns geometry.
    // Re-running our responsive layout re-flows the presenter and can knock
    // the browser straight back out of fullscreen (a visible flash). Skip
    // until fullscreen exits.
    if (document.fullscreenElement) return;
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

  // Drive small-size layout off the WINDOW width. The meeting is a resizable
  // Wm window that can be small even on a large viewport, so @media (viewport)
  // breakpoints don't fire when the user shrinks it — we flip data-narrow /
  // data-compact on the root and let the skin adapt (panel → overlay, tighter
  // controls), Google-Meet style.
  responsive(m, ui) {
    if (super.responsive) super.responsive(m, ui);
    if (!this.el || !this.$el) return;
    const w = this.$el.width() || this.el.offsetWidth || 0;
    if (!w) return;
    this.el.dataset.narrow = w < 640 ? "1" : "0";
    this.el.dataset.compact = w < 520 ? "1" : "0";
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
    this._initIdleControls();
    // Standalone (Wm pool) calls must float via the base window's absolute
    // positioning; embedded meetings (folder tab) stay relative/fill-parent.
    if (this.el) this.el.dataset.standalone = this.mget("standalone") ? "1" : "0";
    if (this.el) this.el.dataset.ready = "0";
    this.feed(require("./skeleton/init")(this));
    this.stateMachine("initializing");
    // Any rejection from join() / prepareConference() (privilege denial that
    // surfaces as a thrown error, device permission denial, network/socket
    // failure, conference bind failure) must still flip data-ready to "1" —
    // otherwise __main stays opacity:0 and the user sees an infinite spinner
    // with no reachable close button.
    let room;
    try {
      room = await this.join();
      if (!room || !room.user) {
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
      this._meetingStartedAt = Date.now();
      this._maxParticipants = 1;
      this._postMeetingSystemMessage("meeting.start");
    } catch (e) {
      if (this.warn) this.warn("meeting onDomRefresh failed", e);
      this.stateMachine("permissionDenied");
    } finally {
      if (this.el) this.el.dataset.ready = "1";
    }
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

  /**
   * Auto-hide the floating control bar after a few seconds of mouse inactivity
   * (reappears on movement). Toggles data-idle on the window root; the skin
   * owns the fade.
   */
  _initIdleControls() {
    if (this._idleBound || !this.el) return;
    this._idleBound = 1;
    this._idleDelay = 3000;
    this._wakeControls = () => {
      if (!this.el) return;
      this.el.dataset.idle = "0";
      clearTimeout(this._idleTimer);
      this._idleTimer = setTimeout(() => {
        if (this.el) this.el.dataset.idle = "1";
      }, this._idleDelay);
    };
    this.el.addEventListener("mousemove", this._wakeControls);
    this._wakeControls();
  }

  onBeforeDestroy() {
    clearTimeout(this._idleTimer);
    // Cancel any pending hand-raise auto-clear timers so they can't fire after
    // teardown.
    if (this._handTimers) {
      for (const t of this._handTimers.values()) clearTimeout(t);
      this._handTimers.clear();
    }
    if (this.el && this._wakeControls)
      this.el.removeEventListener("mousemove", this._wakeControls);
    // Drop the reactions-picker click-outside listener if the window is torn
    // down while the picker is open (removeEventListener is a no-op otherwise).
    this._closeReactionsPicker();
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
      if (sameRoom && options.event === "REACTION") {
        this._applyRemoteReaction(data);
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
    this._refreshMember(drumate_id);
  }

  // When a participant leaves, clear their call/hand/presenting state so the
  // dashboard card flips back from "Joined" to a callable "Call" button (and
  // drops any stale hand-raise / presenting badges). Map the participant id to
  // its drumate uid BEFORE super destroys the endpoint.
  onUserLeft(id) {
    const uid = this._uidForParticipant(id);
    if (super.onUserLeft) super.onUserLeft(id);
    if (uid != null) {
      const key = String(uid);
      if (this._memberCallStates) this._memberCallStates.delete(key);
      if (this._memberHandRaised) this._memberHandRaised.delete(key);
      if (this._memberPresenting) this._memberPresenting.delete(key);
      // Leaving with a hand raised clears immediately (not on timeout) — drop
      // the pending auto-clear timer along with the state.
      this._clearHandTimer(key);
      // Drop stale spotlight refs so focus doesn't stick to a gone tile.
      if (this._lastRaisedUid === key) this._lastRaisedUid = null;
      if (this._dominantPid === id) this._dominantPid = null;
      // If the presenter left without a clean STOP_REMOTE_SCREEN, release the
      // share lock so the rest of the room can present again.
      if (this._currentPresenterUid && key === this._currentPresenterUid) {
        this._currentPresenterUid = null;
        this._setShareLocked(false);
      }
      this._refreshMember(uid);
      this._updateFloatFocus();
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

      case _a.chat:
        this.toggleMeetingChat();
        break;

      case "close-chat":
        this.closeMeetingChat();
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

      case "switch-tab":
        this._switchPanelTab(cmd.mget("tab"));
        break;

      case "show-people":
        // Topbar People button → open the side panel on the Participants tab.
        this._toggleSidePanel("participants");
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

      case "start-screenshare":
      case "stop-screenshare":
        // One screen at a time: block starting a share while a remote is
        // presenting (belt-and-suspenders with the disabled button). The
        // active local presenter is never locked, so they can still stop.
        if (this._shareLocked && !this._presentingLocally) return;
        super.onUiEvent(cmd, args);
        break;

      case "togglefullscreen":
        // The base webrtc room handler calls `document.body.requestFullscreen()`,
        // which puts the entire host page into fullscreen — including the
        // folder window's file list and chrome. For embedded meetings we
        // only want the screen-share widget itself to expand, so target
        // the `webrtc_remote_display` widget element directly.
        this._toggleScreenShareFullscreen();
        break;

      case "toggle-fullscreen":
        // Resize menu → Full screen: the whole meeting window fills the
        // screen (native fullscreen on the window root).
        this._toggleWindowFullscreen();
        break;

      case "tile-window-left":
        this._tileWindow("left");
        break;

      case "tile-window-right":
        this._tileWindow("right");
        break;

      case "reframe-window":
        this._reframeWindow();
        break;

      case "react":
        // A quick-reaction emoji from the topbar bar was clicked. Read the
        // glyph off the button (model attr first, DOM text as fallback) and
        // broadcast it. The emoji button uses bubble:0, so the bar stays open
        // (send several reactions without reopening); it dismisses only via
        // click-outside or the smiley trigger.
        this._sendReaction(
          (cmd.mget && cmd.mget("emoji")) ||
            (cmd.el && cmd.el.textContent && cmd.el.textContent.trim()),
        );
        break;

      case "reactions-more":
        // "…" opens the full emoji picker; glyph picks there are handled by the
        // picker's own capture-phase click listener (_bindReactionsPickerDismiss),
        // which sends the reaction and keeps the bar + picker open.
        this._toggleReactionsPicker();
        break;

      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
   * Slide the embedded team-chat panel in/out (toggled from the topbar chat
   * button or the panel's own close button). Opening it clears the unread
   * badge. The panel embeds widget_chat bound to the team's hub channel, so
   * it's the same persisted conversation as the team window.
   */
  // Topbar expand button: toggle native fullscreen on the meeting window root
  // so the whole call (stage + side panel) fills the screen. Exits if already
  // fullscreen. Errors (e.g. gesture/permission) are swallowed — non-fatal.
  _toggleWindowFullscreen() {
    const doc = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      (doc.exitFullscreen || doc.webkitExitFullscreen || function () {}).call(doc);
      return;
    }
    const el = this.el;
    if (!el) return;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) {
      const p = req.call(el);
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  }

  // Resize menu → Tile left/right: snap the standalone floating window to the
  // corresponding half of the window-manager content area (free windows are
  // absolute inside the WM layer, so its own size is the coordinate space).
  // No-op for embedded (fill-parent) meetings — they have no free geometry.
  _tileWindow(side) {
    this._exitNativeFullscreen();
    const el = this.el;
    if (!el || el.dataset.standalone !== "1") return;
    const availW = (Wm.$el && Wm.$el.width()) || window.innerWidth;
    const availH = (Wm.$el && Wm.$el.height()) || window.innerHeight;
    const half = Math.floor(availW / 2);
    this._applyWindowGeometry(
      side === "right"
        ? { top: 0, left: availW - half, width: half, height: availH }
        : { top: 0, left: 0, width: half, height: availH },
    );
  }

  // Resize menu → Reframe: back to the default centered popup geometry.
  _reframeWindow() {
    this._exitNativeFullscreen();
    const el = this.el;
    if (!el || el.dataset.standalone !== "1") return;
    this._applyWindowGeometry(Wm.centeredPopupGeometry());
  }

  _exitNativeFullscreen() {
    const doc = document;
    if (doc.fullscreenElement || doc.webkitFullscreenElement) {
      (doc.exitFullscreen || doc.webkitExitFullscreen || function () {}).call(doc);
    }
  }

  _applyWindowGeometry({ top, left, width, height }) {
    const el = this.el;
    if (!el) return;
    el.style.top = `${Math.round(top)}px`;
    el.style.left = `${Math.round(left)}px`;
    el.style.width = `${Math.round(width)}px`;
    el.style.height = `${Math.round(height)}px`;
    // Re-run the size-driven layout (tile grid, data-narrow/compact flags).
    this.responsive((el.dataset && el.dataset.mode) || "normal");
  }

  _chatPanelEl() {
    return this.el && this.el.querySelector(`.${this.fig.family}__chat-panel`);
  }

  _setChatOpen(open) {
    const panel = this._chatPanelEl();
    if (!panel) return;
    panel.dataset.open = open ? "1" : "0";
    if (open) {
      const badge = this.el.querySelector(
        `.${this.fig.family}__in-topbar-chat-badge`,
      );
      if (badge) badge.dataset.state = 0;
    }
  }

  // Topbar chat button: open the side panel on the Chat tab, or collapse it if
  // it's already open on Chat (so the one button toggles).
  toggleMeetingChat() {
    this._toggleSidePanel("chat");
  }

  closeMeetingChat() {
    this._setChatOpen(false);
  }

  _toggleSidePanel(tab) {
    const panel = this._chatPanelEl();
    if (!panel) return;
    if (panel.dataset.open === "1" && panel.dataset.tab === tab) {
      this._setChatOpen(false);
      return;
    }
    this._switchPanelTab(tab);
  }

  // Show `tab` and open the panel. Panes are never re-mounted, so chat and the
  // docked tiles keep their state across switches.
  _switchPanelTab(tab) {
    if (this._applyPanelTab(tab)) this._setChatOpen(true);
  }

  // Set the active tab (data-tab + button highlight) without changing whether
  // the panel is open — used to restore the prior tab after a share ends.
  _applyPanelTab(tab) {
    if (tab !== "participants" && tab !== "chat") return false;
    const panel = this._chatPanelEl();
    if (!panel) return false;
    panel.dataset.tab = tab;
    const tabs = panel.querySelectorAll(`.${this.fig.family}__chat-tab`);
    tabs.forEach((b) => {
      b.dataset.state = b.dataset.tab === tab ? "1" : "0";
    });
    return true;
  }

  // Google Meet behavior for the sharer's own view: render our shared screen
  // on the big presenter stage, with the participant tiles (including our own
  // avatar) collapsed into the side strip via presenter mode. Jitsi never
  // echoes our own desktop track back as a remote track, so we feed the *live
  // local* track into the same `webrtc_remote_display` widget that viewers
  // use. Attaching a local track to a <video> is display-only and does not
  // affect the stream published to peers.
  async startPresentation() {
    let r;
    try {
      r = await super.startPresentation();
    } catch (e) {
      // User canceled the screen-picker (gum.screensharing_user_canceled) or a
      // device error — already warned by the base layer. Swallow it so it
      // doesn't surface as an uncaught promise rejection.
      return false;
    }
    // Only mount the stage when sharing actually started (super returns true);
    // the bail-out branches return false/undefined.
    if (r === true) {
      // The desktop track is stored synchronously under `localTracks.video`
      // (createLocalTracks keys by `track.getType()`, which is "video" for a
      // desktop track) BEFORE `room.addTrack` runs. `getLocalTrack(desktop)`
      // scans the room's tracks and can miss it if addTrack hasn't registered
      // it yet, and `localTracks.desktop` never exists — so fall back to
      // `localTracks.video`, which is the live desktop track while sharing.
      const track =
        this.getLocalTrack(_a.desktop) ||
        (this.localTracks && this.localTracks.video);
      if (track) {
        try {
          // Render our own screen on the presenter stage (Jitsi never echoes
          // our desktop track back as a remote track), switch to presenter
          // mode, and dock the tiles into the side panel.
          this._presentingLocally = true;
          await this.loadRemotePresentation(track);
          this.responsive("presenter");
          this._dockParticipants(true);
        } catch (e) {
          if (this.warn) this.warn("own screen presentation failed", e);
        }
      } else if (this.warn) {
        this.warn("own screen presentation: no desktop track");
      }
    }
    return r;
  }

  async stopPresentation(track) {
    // Tear our own screen off the presenter stage and drop back to the grid.
    // onRemoteScreenStop clears __presenter and returns to "normal" mode; it's
    // idempotent, so a double-fire from the track-stopped path is harmless.
    if (this._presentingLocally) {
      this._presentingLocally = false;
      if (typeof this.onRemoteScreenStop === "function") this.onRemoteScreenStop();
    }
    return super.stopPresentation(track);
  }

  _toggleScreenShareFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    if (!this.__presenter || this.__presenter.isEmpty()) {
      // Nothing is being presented — clicking fullscreen on an empty slot
      // would maximize a black void. Bail.
      return;
    }
    const child = this.__presenter.children && this.__presenter.children.last();
    if (!child || child.isDestroyed()) return;
    // Fullscreen the <video> element itself, not the widget root. The meeting
    // window is Wm-positioned under an absolutely-placed, transformed ancestor;
    // fullscreening a nested <div> in that context makes Chrome enter and
    // instantly drop fullscreen (the "flash"). A <video> is promoted to the
    // browser's top layer and is immune to ancestor transforms, so it stays
    // fullscreen reliably. ESC exits.
    const target = (child.__video && child.__video.el) || child.el;
    if (!target || typeof target.requestFullscreen !== "function") return;
    target.requestFullscreen().catch((e) => {
      if (this.warn) this.warn("requestFullscreen failed", e);
    });
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

  _setMemberHandRaised(uid, on, opts = {}) {
    if (!uid) return;
    const key = String(uid);
    if (on) this._memberHandRaised.set(key, 1);
    else this._memberHandRaised.delete(key);
    this._applyTileDataset(uid, "raised", on);
    if (on) {
      // Remember the most recent raiser so the float overlay can spotlight
      // them, and (re)start the 30s auto-clear timer — a re-raise resets it.
      this._lastRaisedUid = key;
      this._startHandTimer(key, !!opts.isLocal);
    } else {
      this._clearHandTimer(key);
    }
    this._refreshMember(uid);
    this._updateFloatFocus();
    this._updateHandRaiseBadge();
  }

  // Count badge on the top-bar hand control: shows how many participants have a
  // hand up (local + remotes, from _memberHandRaised), and is hidden until more
  // than one hand is raised (Figma 2596-129355 / 2502-72231). The badge is a
  // Note (sys_pn "hand-count" → __handCount); setting textContent on a Note el
  // matches the host-label pattern.
  _updateHandRaiseBadge() {
    const count = this._memberHandRaised ? this._memberHandRaised.size : 0;
    const badge = this.__handCount;
    const el =
      (badge && badge.el) ||
      (this.el &&
        this.el.querySelector(`.${this.fig.family}__ctrl-hand-badge`));
    if (!el) return;
    if (count > 1) {
      el.textContent = String(count);
      el.dataset.state = 1;
    } else {
      el.textContent = "";
      el.dataset.state = 0;
    }
  }

  // ── Raise-hand 30s lifecycle (Figma spec 2517-15617) ────────────────────
  // A raised hand auto-clears after 30s; re-raising resets the timer. Every
  // client runs its own per-uid timer (keyed like _memberHandRaised) so a
  // missed clear broadcast still self-heals. The local user's expiry also
  // syncs the top-bar control and tells peers.
  _startHandTimer(uid, isLocal) {
    if (!this._handTimers) this._handTimers = new Map();
    this._clearHandTimer(uid);
    this._handTimers.set(
      String(uid),
      setTimeout(() => this._expireHand(uid, isLocal), 30000),
    );
  }

  _clearHandTimer(uid) {
    const key = String(uid);
    if (this._handTimers && this._handTimers.has(key)) {
      clearTimeout(this._handTimers.get(key));
      this._handTimers.delete(key);
    }
  }

  _expireHand(uid, isLocal) {
    const key = String(uid);
    this._clearHandTimer(key);
    // Already lowered (manual lower / leave beat the timer) — nothing to do.
    if (!this._memberHandRaised || !this._memberHandRaised.has(key)) return;
    if (isLocal) {
      this._lowerOwnHand();
    } else {
      this._setMemberHandRaised(uid, false);
    }
  }

  _broadcastHandRaise(state) {
    try {
      this.sendRoomSignaling(SERVICE.conference.broadcast, {
        event: "HAND_RAISE",
        payload: {
          room_id: this.mget(_a.room_id),
          participant_id:
            this.room && this.room.myUserId && this.room.myUserId(),
          uid: Visitor.id,
          state,
        },
      });
    } catch (e) {
      if (this.warn) this.warn("hand-raise broadcast failed", e);
    }
  }

  _setMemberPresenting(uid, on) {
    if (!uid) return;
    const key = String(uid);
    if (on) this._memberPresenting.set(key, 1);
    else this._memberPresenting.delete(key);
    this._applyTileDataset(uid, "presenting", on);
    this._refreshMember(uid);
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

  // ── Float-overlay focus (single-participant view while sharing) ──────────
  // The float overlay stacks every tile at full frame; whichever tile carries
  // data-focused="1" is raised to the front (skin z-index). This picks WHO to
  // show: the most recent hand-raiser, else the dominant speaker, else the
  // local self-view. Only meaningful while the tiles are docked (a share is on).

  // Jitsi dominant-speaker changed. Keep the base behavior (per-tile
  // data-speaking ring), then re-point the float spotlight at the speaker.
  onDominantSpeaker(id) {
    if (super.onDominantSpeaker) super.onDominantSpeaker(id);
    this._dominantPid = id || null;
    this._updateFloatFocus();
  }

  // True while the live tiles are docked into the float overlay (i.e. a screen
  // is being shared) — the only time focus switching is visible.
  _floatDocked() {
    return !!(
      this._participantsHome && this._participantsHome.dataset.docked === "1"
    );
  }

  _myParticipantId() {
    return this.room && this.room.myUserId ? this.room.myUserId() : null;
  }

  // uid of the participant to spotlight for a raised hand: the most recent
  // raiser still raised, else any remaining raised hand, else null.
  _activeRaisedUid() {
    if (!this._memberHandRaised || !this._memberHandRaised.size) return null;
    if (this._lastRaisedUid && this._memberHandRaised.has(this._lastRaisedUid)) {
      return this._lastRaisedUid;
    }
    const keys = Array.from(this._memberHandRaised.keys());
    return keys[keys.length - 1] || null;
  }

  // Priority: raised hand > dominant speaker > local self-view.
  _updateFloatFocus() {
    if (!this._floatDocked()) return;
    const raisedUid = this._activeRaisedUid();
    if (raisedUid != null) return this._focusByUid(raisedUid);
    if (this._dominantPid) return this._focusByPid(this._dominantPid);
    return this._focusLocalTile();
  }

  _focusByUid(uid) {
    if (String(uid) === String(Visitor.id)) return this._focusLocalTile();
    if (this.endpoints) {
      for (const pid of Object.keys(this.endpoints)) {
        const ep = this.endpoints[pid];
        if (!ep || ep.isDestroyed()) continue;
        if (String(ep.mget(_a.uid)) !== String(uid)) continue;
        return this._applyFloatFocus(ep.el);
      }
    }
    // Raiser has no live tile (edge) — fall back so the overlay isn't blank.
    return this._focusLocalTile();
  }

  _focusByPid(pid) {
    if (pid === this._myParticipantId()) return this._focusLocalTile();
    const ep = this.endpoints && this.endpoints[pid];
    if (ep && !ep.isDestroyed() && ep.el) return this._applyFloatFocus(ep.el);
    return this._focusLocalTile();
  }

  _focusLocalTile() {
    if (typeof this.getLocalParts !== "function") return;
    this.getLocalParts()
      .then((parts) => {
        const local = parts && parts.local;
        if (local && !local.isDestroyed() && local.el) {
          this._applyFloatFocus(local.el);
        }
      })
      .catch(() => {});
  }

  // Move data-focused onto `el`, clearing it from every other tile in the
  // float overlay so exactly one participant is spotlighted.
  _applyFloatFocus(el) {
    if (!el || !this.el) return;
    const float = this.el.querySelector(`.${this.fig.family}__float-tiles`);
    if (!float || !float.contains(el)) return;
    float
      .querySelectorAll('[data-focused="1"]')
      .forEach((n) => { n.dataset.focused = "0"; });
    el.dataset.focused = "1";
  }

  _clearFloatFocus() {
    if (!this.el) return;
    const float = this.el.querySelector(`.${this.fig.family}__float-tiles`);
    if (!float) return;
    float
      .querySelectorAll('[data-focused="1"]')
      .forEach((n) => { n.dataset.focused = "0"; });
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
      return;
    }
    this._pinnedParticipantId = pid;
    this._pinnedIsLocal = !!(args && args.isLocal);
    const tile = this._tileForPin(pid, this._pinnedIsLocal);
    if (tile && tile.el) tile.el.dataset.pinned = 1;
    if (this.el) this.el.dataset["pinned-mode"] = 1;
    // NOTE: do NOT call responsive("presenter") here. Forcing presenter
    // mode when no one is actually sharing leaves the __presenter slot
    // visible but empty — rendering as a huge black rectangle. The pin
    // is now purely a visual highlight on the existing grid; participants
    // sizing follows the natural mode (normal / presenter on real share).
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
    // state:1 (re)starts this client's safety timer for the raiser; state:0
    // (the raiser's own auto-clear/manual-lower) cancels it.
    this._setMemberHandRaised(uid, !!data.state, { isLocal: false });
  }

  // Top-bar Raise-hand control: a toggle. Click raises (and starts the 30s
  // auto-clear timer); click again lowers. Mirrors the state on our own
  // dashboard card and broadcasts to peers. The 30s timeout still lowers it
  // automatically if the user never toggles it back.
  _toggleHandRaise(cmd) {
    const el = cmd && cmd.el;
    const raised = el
      ? el.dataset.raised === "1"
      : !!(this._memberHandRaised &&
          this._memberHandRaised.has(String(Visitor.id)));
    if (raised) {
      this._lowerOwnHand();
      return;
    }
    if (el) {
      el.dataset.raised = 1;
      el.setAttribute("title", LOCALE.LOWER_HAND || "Lower hand");
    }
    this._setMemberHandRaised(Visitor.id, true, { isLocal: true });
    this._broadcastHandRaise(1);
  }

  // Manual lower — kept as a convenience alongside the 30s auto-clear. Fired
  // from the member card's "Lower hand" action and from the local hand timer's
  // expiry. Syncs the top-bar control, clears state (which cancels the timer),
  // and tells peers.
  _lowerOwnHand() {
    // Source of truth is the state map; the top-bar control (sys_pn
    // "ctrl-hand" → __ctrlHand) is just UI to sync. Guarding on the map (not
    // the button dataset) is what lets the 30s auto-clear reliably drop the
    // button's active state.
    const key = String(Visitor.id);
    if (this._memberHandRaised && !this._memberHandRaised.has(key)) return;
    // Resolve the button via its part, falling back to a DOM lookup so the
    // active state clears even if the part isn't bound.
    const cmd = this.__ctrlHand;
    const btnEl =
      (cmd && cmd.el) ||
      (this.el &&
        this.el.querySelector(`.${this.fig.family}__ctrl-btn.hand-raise`));
    if (btnEl) {
      btnEl.dataset.raised = 0;
      btnEl.setAttribute("title", LOCALE.RAISE_HAND || "Raise hand");
    }
    this._setMemberHandRaised(Visitor.id, false);
    this._broadcastHandRaise(0);
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
    // Viewer side: dock the tiles into the panel as soon as the share is
    // announced, so the strip never lingers in the main stage.
    this._dockParticipants(true);
    // Only one screen at a time — lock our own share control while a REMOTE
    // participant is presenting. Never lock when we're the presenter (our own
    // screen renders through the same webrtc_remote_display, which also drives
    // these hooks — locking there disabled the sharer's own button).
    if (!this._presentingLocally) this._setShareLocked(true);
    const uid = (args && args.uid) || this._uidForParticipant(args && args.id);
    if (uid) {
      this._currentPresenterUid = String(uid);
      this._setMemberPresenting(uid, true);
    }
  }

  // The one dock hook a late joiner hits: they miss the START_REMOTE_SCREEN
  // broadcast (so prepareRemoteScreen never runs) and discover the share via
  // onStreamReceived → loadRemotePresentation → here. Idempotent.
  onRemoteScreenStart(size) {
    if (super.onRemoteScreenStart) super.onRemoteScreenStart(size);
    this._dockParticipants(true);
    // Our own presentation display fires start-remote-screen too — only lock
    // the button for a genuine REMOTE share, never our own (see prepareRemoteScreen).
    if (!this._presentingLocally) this._setShareLocked(true);
  }

  onRemoteScreenStop() {
    // Never let a remote peer's stop (notably the base STOP_REMOTE_SCREEN 5s
    // safety timer) tear down OUR own active share — that cleared __presenter /
    // reset the screen button mid-share, leaving us unable to stop it. A legit
    // self-stop routes through stopPresentation, which clears _presentingLocally
    // BEFORE calling this, so the teardown below still runs there.
    if (this._presentingLocally) return;
    if (super.onRemoteScreenStop) super.onRemoteScreenStop();
    this._dockParticipants(false);
    // Remote share ended — let everyone start their own again.
    this._setShareLocked(false);
    if (this._currentPresenterUid) {
      this._setMemberPresenting(this._currentPresenterUid, false);
      this._currentPresenterUid = null;
    }
  }

  // Catch-all unlock: the base tears the presenter down here whenever a peer
  // leaves (remote-gone / disconnect), which can bypass onRemoteScreenStop —
  // notably for a late joiner who never tracked `_currentPresenterUid`. Release
  // the share lock whenever the peer being removed WAS the active presenter.
  removePresenter(peer) {
    const wasPresenter = !!(
      this.__presenter &&
      typeof this.__presenter.getItemsByAttr === "function" &&
      peer &&
      this.__presenter.getItemsByAttr("participant_id", peer.participant_id)[0]
    );
    if (super.removePresenter) super.removePresenter(peer);
    if (wasPresenter) {
      this._setShareLocked(false);
      this._currentPresenterUid = null;
    }
  }

  // Lock/unlock the local "share screen" control. While a remote participant
  // is presenting, other participants can't start their own share (one screen
  // at a time); the presenter's own button is never touched (they never hit
  // the remote-screen hooks), so they can still stop. Visual disable + a guard
  // in onUiEvent both key off `_shareLocked`.
  _setShareLocked(locked) {
    this._shareLocked = !!locked;
    const btn = this.__ctrlScreen;
    if (!btn || !btn.el || (btn.isDestroyed && btn.isDestroyed())) return;
    btn.el.dataset.disabled = locked ? "1" : "0";
    btn.el.setAttribute(
      "title",
      locked
        ? (LOCALE.SCREEN_SHARE_BUSY || "Someone is already sharing their screen")
        : (LOCALE.SHARE_SCREEN || "Share screen"),
    );
  }

  // Local desktop track mute/unmute is the only signal we get for our own
  // share lifecycle (we don't receive our own START/STOP broadcast). Hook
  // it to mirror the same uid-keyed state the dashboard reads.
  onTrackMuteChange(track) {
    if (super.onTrackMuteChange) super.onTrackMuteChange(track);
    if (!track || typeof track.getType !== "function") return;
    const type = track.getType();
    if (type === _a.audio) {
      // The base handler only syncs the top-bar mic pill; the local self-tile's
      // mic badge (unlike the remote one) is never seeded or updated, so its
      // muted state never shows. Reflect it here — data-state "0" = muted,
      // which the skin reveals; "1" = live, hidden.
      this._setLocalTileMic(!track.isMuted());
      return;
    }
    if (type !== _a.video) return;
    if (typeof track.getVideoType !== "function") return;
    if (track.getVideoType() !== _a.desktop) return;
    this._setMemberPresenting(Visitor.id, !track.isMuted());
  }

  // Set the local self-tile mic badge's data-state. Target it by class within
  // the local tile — its sys_pn ("audio") collides with the tile's <audio>
  // element, so a part lookup would be ambiguous.
  _setLocalTileMic(isLive) {
    if (typeof this.getLocalParts !== "function") return;
    this.getLocalParts()
      .then((parts) => {
        const local = parts && parts.local;
        if (!local || (local.isDestroyed && local.isDestroyed()) || !local.el) {
          return;
        }
        const fam = (local.fig && local.fig.family) || "endpoint-local";
        const mic = local.el.querySelector(`.${fam}__tile-mic`);
        if (mic) mic.dataset.state = isLive ? 1 : 0;
      })
      .catch(() => {});
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
    this._refreshMember(guest_id);
    try {
      await this.sendRoomSignaling(SERVICE.conference.invite, { guest_id });
    } catch (e) {
      this._memberCallStates.delete(key);
      this._refreshMember(guest_id);
      if (this.warn) this.warn("conference.invite failed", e);
    }
  }

  // Re-render only the affected member row so call-state / hand-raise /
  // presenting updates show *without* reloading (re-fetching) the whole roster.
  // The row reads its state from `_meetingUi` (this), which the callers update
  // before calling here. (The live tiles, shown instead while sharing, update
  // themselves via _applyTileDataset.)
  _refreshMember(uid) {
    if (uid == null) return;
    const list = this.getPart && this.getPart("roster-list");
    if (!list || !list.children || typeof list.children.each !== "function") return;
    const key = String(uid);
    list.children.each((item) => {
      if (!item || (item.isDestroyed && item.isDestroyed()) || !item.mget) return;
      const id = item.mget(_a.drumate_id) || item.mget(_a.entity_id) || item.mget(_a.uid);
      if (id != null && String(id) === key && typeof item.onDomRefresh === "function") {
        item.onDomRefresh();
      }
    });
  }

  // Move the live webrtc_participants tiles widget between the main stage
  // (__endpoints) and the side panel's Participants pane. While a screen is
  // shared we dock the tiles into the panel so the shared screen owns the full
  // main stage; when sharing stops we move them back into the grid. The same
  // widget element is relocated (never re-mounted), so video tracks stay
  // attached. No-op on DMZ (no side panel).
  async _dockParticipants(toPanel) {
    if (this.mget(_a.area) === _a.dmz) return;
    try {
      const participants = this.__participants;
      if (!participants || participants.isDestroyed() || !participants.el) return;
      // Remember the tiles' original home (the __endpoints grid — which isn't a
      // registered part) the first time we move them, so we can put them back.
      if (!this._participantsHome && participants.el.parentNode) {
        this._participantsHome = participants.el.parentNode;
      }
      // Figma share view: the tiles float bottom-right OVER the shared screen
      // (a small overlay stack), the panel keeps whatever tab the user had.
      const targetEl = toPanel
        ? (await this.ensurePart("float-tiles"))?.el
        : this._participantsHome;
      if (!targetEl) return;
      if (participants.el.parentNode !== targetEl) {
        targetEl.appendChild(participants.el);
      }
      // Flag the stage so its grid drops the now-empty 200px participants
      // column and the shared screen can fill the full width. The float
      // container shows itself off the same flag.
      if (this._participantsHome) {
        this._participantsHome.dataset.docked = toPanel ? "1" : "0";
      }
      if (toPanel) {
        // Now that the tiles live in the overlay, pick the initial spotlight
        // (defaults to the local self-view until someone talks / raises a hand).
        this._updateFloatFocus();
      } else {
        // Re-lay out the grid immediately. The base responsive() defers the
        // participants relayout ~1s, which leaves the tiles briefly in their
        // docked single-column form — a visible glitch right after the screen
        // closes. Doing it now makes the return to the grid clean.
        this._clearFloatFocus();
        if (typeof participants.responsive === "function") {
          participants.responsive("normal");
        }
      }
    } catch (e) {
      if (this.warn) this.warn("dock participants failed", e);
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
    // Close the window; onBeforeDestroy → super releases the room (leave +
    // disconnect). No "leave-meeting" re-emit — that's a legacy embedded-tab
    // signal that now only reaches the Wm unhandled (standalone window).
    this.goodbye();
  }

  stateMessage(s, timeout) {
    // No "Waiting for attendees" toast (Figma: a solo call just shows your own
    // tile). The base stateMessage would fall back to the raw state string
    // ("waiting"), so clear the message container and swallow the state.
    if (s === "waiting") {
      this.ensurePart("message-container").then((c) => c.clear());
      return;
    }
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
    // permissionDenied is terminal — the conference never bound, so the
    // real local-user webrtc widget can't render. Build a static "solo
    // call" preview (Visitor avatar + name) and overlay the denial text,
    // matching the look of a normal 1-participant call. A small icon-only
    // X in the corner exits back to the widget_meeting panel.
    if (s === "permissionDenied") {
      const fullname = (Visitor.fullname && Visitor.fullname())
        || `${Visitor.get(_a.firstname) || ""} ${Visitor.get(_a.lastname) || ""}`.trim()
        || Visitor.get(_a.username) || "";
      // Flag the widget for the solo-preview layout so SCSS can expand the
      // message-container to fill the body (avatar centered, denial text
      // beneath) instead of the small floating tooltip used by other states.
      if (this.el) this.el.dataset.denied = "1";
      this.ensurePart("message-container").then((c) => {
        c.feed([
          Skeletons.Button.Svg({
            ico: "cross",
            className: "message-close-x",
            service: "leave-meeting",
            uiHandler: [this],
          }),
          Skeletons.UserProfile({
            className: "message-avatar",
            id: Visitor.id,
            fullname,
            live_status: 0,
            auto_color: 1,
          }),
          Skeletons.Note({ className: "message-name", content: fullname }),
          Skeletons.Note({ className: "message-text", content: message }),
        ]);
      });
      return;
    }
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

// Shared in-call reactions behavior (also used by window_connect).
Object.assign(__window_meeting.prototype, require("builtins/webrtc/reactions"));

//__window_meeting.initClass();

module.exports = __window_meeting;
