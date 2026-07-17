// Shared in-call screen-share behavior, mixed into the team meeting and the 1:1
// connect windows (Object.assign onto each class prototype). Covers: rendering
// your OWN shared screen on the presenter stage, docking the participant tiles
// into the float overlay so the shared screen owns the stage, one-screen-at-a-
// time locking of the share control, and fullscreen.
//
// These override webrtc/room/jitsi methods, but `super` can't be used from
// Object.assign'd methods (its [[HomeObject]] would be this plain object, not
// the class), so we call the base explicitly via __room.prototype.X.call(this).
// Both windows extend __room, so that resolves to the same base method `super`
// would have.
//
// Meeting-only touchpoints (the dashboard roster / float-focus / presenting
// badges) are OPTIONAL — guarded so they run in the meeting and are skipped in
// connect, which doesn't define them (_setMemberPresenting / _updateFloatFocus /
// _clearFloatFocus / _uidForParticipant).
const __room = require("builtins/webrtc/room/jitsi");

module.exports = {
  // Render our own screen on the presenter stage (Jitsi never echoes our own
  // desktop track back as a remote track), switch to presenter mode, and dock
  // the tiles. Attaching a local track to a <video> is display-only.
  async startPresentation() {
    let r;
    try {
      r = await __room.prototype.startPresentation.call(this);
    } catch (e) {
      // User canceled the screen-picker / device error — already handled by the
      // base layer. Swallow so it doesn't surface as an unhandled rejection.
      return false;
    }
    if (r === true) {
      // The desktop track is stored synchronously under `localTracks.desktop`
      // (createLocalTracks now keys video tracks by videoType so the screen
      // share coexists with the camera). getLocalTrack(desktop) resolves it once
      // addTrack has run; fall back to the desktop slot otherwise. NB: do NOT
      // fall back to localTracks.video — that is the CAMERA when it's on.
      const track =
        this.getLocalTrack(_a.desktop) ||
        (this.localTracks && this.localTracks.desktop);
      if (track) {
        try {
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
  },

  async stopPresentation(track) {
    // Tear our own screen off the stage and drop back to the grid.
    // onRemoteScreenStop is idempotent; clear _presentingLocally FIRST so its
    // own guard doesn't skip the teardown.
    if (this._presentingLocally) {
      this._presentingLocally = false;
      if (typeof this.onRemoteScreenStop === "function") this.onRemoteScreenStop();
    }
    return __room.prototype.stopPresentation.call(this, track);
  },

  // Triggered from the local member card's "Stop sharing" action (meeting only).
  _stopOwnPresentation() {
    if (typeof this.stopPresentation === "function") {
      try { this.stopPresentation(); } catch (e) { if (this.warn) this.warn(e); }
    }
    if (this._setMemberPresenting) this._setMemberPresenting(Visitor.id, false);
  },

  // Remote user started screen sharing (viewer side).
  prepareRemoteScreen(args) {
    if (__room.prototype.prepareRemoteScreen) {
      __room.prototype.prepareRemoteScreen.call(this, args);
    }
    // Dock the tiles into the float overlay so the shared screen owns the stage.
    this._dockParticipants(true);
    // One screen at a time — lock our own share control while a REMOTE peer is
    // presenting. Never lock when we're the presenter (our own screen renders
    // through the same webrtc_remote_display, which also drives this hook).
    if (!this._presentingLocally) this._setShareLocked(true);
    // Presenting badge + uid tracking is a meeting dashboard concern.
    if (this._setMemberPresenting) {
      const uid = (args && args.uid) ||
        (this._uidForParticipant && this._uidForParticipant(args && args.id));
      if (uid) {
        this._currentPresenterUid = String(uid);
        this._setMemberPresenting(uid, true);
      }
    }
  },

  // Late joiner path: missed the START_REMOTE_SCREEN broadcast, discovers the
  // share via onStreamReceived → loadRemotePresentation → here. Idempotent.
  onRemoteScreenStart(size) {
    if (__room.prototype.onRemoteScreenStart) {
      __room.prototype.onRemoteScreenStart.call(this, size);
    }
    this._dockParticipants(true);
    if (!this._presentingLocally) this._setShareLocked(true);
  },

  onRemoteScreenStop() {
    // Never let a remote peer's stop (notably the base STOP_REMOTE_SCREEN 5s
    // safety timer) tear down OUR own active share. A legit self-stop routes
    // through stopPresentation, which clears _presentingLocally before calling.
    if (this._presentingLocally) return;
    if (__room.prototype.onRemoteScreenStop) {
      __room.prototype.onRemoteScreenStop.call(this);
    }
    this._dockParticipants(false);
    this._setShareLocked(false);
    if (this._currentPresenterUid) {
      if (this._setMemberPresenting) {
        this._setMemberPresenting(this._currentPresenterUid, false);
      }
      this._currentPresenterUid = null;
    }
  },

  // Catch-all unlock when a peer leaves (remote-gone / disconnect) — can bypass
  // onRemoteScreenStop. Release the lock if the removed peer WAS the presenter.
  removePresenter(peer) {
    const wasPresenter = !!(
      this.__presenter &&
      typeof this.__presenter.getItemsByAttr === "function" &&
      peer &&
      this.__presenter.getItemsByAttr("participant_id", peer.participant_id)[0]
    );
    if (__room.prototype.removePresenter) {
      __room.prototype.removePresenter.call(this, peer);
    }
    if (wasPresenter) {
      this._setShareLocked(false);
      this._currentPresenterUid = null;
    }
  },

  // Lock/unlock the "share screen" control: while a remote peer is presenting,
  // others can't start their own share. Disabled (data-disabled) + backed by an
  // onUiEvent guard keying off `_shareLocked`.
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
  },

  _toggleScreenShareFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    if (!this.__presenter || this.__presenter.isEmpty()) return;
    const child = this.__presenter.children && this.__presenter.children.last();
    if (!child || child.isDestroyed()) return;
    // Fullscreen the <video> element itself, not the widget root: a nested <div>
    // under a transformed Wm ancestor makes Chrome enter+instantly-drop
    // fullscreen; a <video> is promoted to the top layer and stays. ESC exits.
    const target = (child.__video && child.__video.el) || child.el;
    if (!target || typeof target.requestFullscreen !== "function") return;
    target.requestFullscreen().catch((e) => {
      if (this.warn) this.warn("requestFullscreen failed", e);
    });
  },

  // Move the live webrtc_participants tiles between the main stage (__endpoints)
  // and the float overlay. While sharing, dock them so the shared screen owns
  // the stage; on stop, move them back. Same element relocated (tracks stay
  // attached). No-op on DMZ. Float-focus is meeting-only (guarded).
  async _dockParticipants(toPanel) {
    if (this.mget(_a.area) === _a.dmz) return;
    try {
      const participants = this.__participants;
      if (!participants || participants.isDestroyed() || !participants.el) return;
      if (!this._participantsHome && participants.el.parentNode) {
        this._participantsHome = participants.el.parentNode;
      }
      const targetEl = toPanel
        ? (await this.ensurePart("float-tiles"))?.el
        : this._participantsHome;
      if (!targetEl) return;
      if (participants.el.parentNode !== targetEl) {
        targetEl.appendChild(participants.el);
      }
      // Flag the stage so its grid drops the participants column and the shared
      // screen fills the full width; the float container shows off the same flag.
      if (this._participantsHome) {
        this._participantsHome.dataset.docked = toPanel ? "1" : "0";
      }
      if (toPanel) {
        if (this._updateFloatFocus) this._updateFloatFocus();
      } else {
        if (this._clearFloatFocus) this._clearFloatFocus();
        // Re-lay out the grid immediately (base responsive() defers ~1s, leaving
        // the tiles briefly in docked single-column form — a visible glitch).
        if (typeof participants.responsive === "function") {
          participants.responsive("normal");
        }
      }
    } catch (e) {
      if (this.warn) this.warn("dock participants failed", e);
    }
  },
};
