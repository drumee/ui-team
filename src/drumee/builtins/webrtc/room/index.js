const JitsiMeetJS = require('vendor/lib/jitsi/lib-jitsi-meet.min.js');
const { timestamp } = require("@drumee/ui-essentials")
const { mediaErrorMessage } = require("builtins/webrtc/media-error");

const __interact = require("window/interact/webrtc");
class __webrtc_room extends __interact {
  /**
   *
   * @param {*} opt
   */
  initialize(opt) {
    super.initialize(opt);
    this.attendees = {};
    this.selectedInputDevice = "";
    this.selectedOutputDevice = "";
    RADIO_NETWORK.once(_e.offline, this.handleError.bind(this));
    this.model.set({
      mode: "normal",
    });
    this.statusMessages = {
      initializing: LOCALE.INITIALIZING,
      joining: LOCALE.WAITING_FOR_X.format(LOCALE.PERMISSION.toLowerCase()),
      // The account/room privilege the SERVER refused (conference.join returned
      // no user permission). NOT for a blocked mic or camera — that is
      // `mediaDenied`, which mediaErrorMessage() replaces with the real cause.
      permissionDenied: LOCALE.WEAK_PRIVILEGE,
      // The join request never reached the server, or never came back. Nothing
      // is wrong with the user's rights, so do not blame their privilege.
      unreachable: LOCALE.CONNECTION_LOST,
      mediaDenied: LOCALE.DEVICES_PERMISSION_DENIED.format(
        `${LOCALE.MICROPHONE.toLowerCase()} / ${LOCALE.CAMERA.toLowerCase()}`,
      ),
      getUserDevices: LOCALE.WAITING_FOR_X.format(LOCALE.PERMISSION.toLowerCase()),
    };
    this.isAudio = this.mget(_a.audio) > 0;
    this.isVideo = this.mget(_a.video) > 0;
    this.handshakes = {};
    this.isFullScreen = 0;
    this.acceptMedia = 0;
    this.isWebrtc = 1;
  }

  /**
   *
   */
  onBeforeDestroy() {
    Visitor.muteSound();
    this.unbindEvent("conference");
    if (this._onFullScreenChange)
      document.removeEventListener("fullscreenchange", this._onFullScreenChange);
    try {
      super.onBeforeDestroy();
    } catch (e) { }
    this.leaveRoom();
    if (this.watchdog) clearInterval(this.watchdog);
    if (this._timerInterval) clearInterval(this._timerInterval);
    if (this._responsiveTimer) clearTimeout(this._responsiveTimer);
  }

  /**
   * Conference rooms don't represent a media path, so skip the
   * breadcrumb fetch that would 403 on the room's synthetic ids.
   */
  updateBreadcrumb() { }

  /**
   *
   */
  failed(message, file) {
    this.warn("called by ", file, message);
    this.dispose();
    this.warning(message.error);
  }

  /**
   *
   * @param {*} s
   */
  defaultState(s = _e.close) {
    this._setService("ctrl-screen", null);
    this._setService("ctrl-video", null);
    this._setService("ctrl-audio", null);
    this._setService("ctrl-line", s);
    this.ensurePart("commands").then((p) => {
      p.el.hide();
    });
  }

  /**
   * Enable/disable a call control without using data-muted (muted blocks UI via
   * CSS strikethrough on data-state; data-disabled is the only click gate).
   */
  _setService(name, service) {
    const target = this.getPart(name);
    if (!target) return;
    target.mset({ service });
    target.el.dataset.disabled = service ? 0 : 1;
  }

  /**
   *
   */
  _updateElapsedTimer() {
    const p = this.getPart("elapsed-timer");
    if (!p || !this._elapsedStart) return;
    const elapsed = Math.floor((Date.now() - this._elapsedStart) / 1000);
    const s = elapsed % 60;
    const m = Math.floor(elapsed / 60) % 60;
    const h = Math.floor(elapsed / 3600);
    const pad = n => String(n).padStart(2, "0");
    p.el.textContent = h ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
  }

  /**
   *
   */
  stateMachine(s, data) {
    this.state = s;
    switch (s) {
      case "online":
        this.isOnine = 1;
        this.mset({ start_at: timestamp() });
        if (this.watchdog) return;
        this._elapsedStart = Date.now();
        if (!this._timerInterval) {
          this._timerInterval = setInterval(() => this._updateElapsedTimer(), 1000);
        }
        let wd = setInterval(() => {
          let t = this.getLocalTrack(_a.audio);
          if (t && t.isActive()) {
            clearInterval(wd);
            this.initCommadPanel({});
          }
        }, 1000);
        this.watchdog = wd;
        break;
      case "nop":
        this.stateMessage(s);
        break;
      default:
        this.stateMessage(s);
    }
  }

  /**
   *
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    this.raise();
    switch (pn) {
      case _a.content:
        child.$el.addClass(`${this.fig.group}__singelton`);
        this.setupInteract();
        this.raise();
        break;
      case "share-bar-countdown-timer":
        child.on("done", async () => {
          Butler.upgrade().then(() => {
            this.goodbye();
          })
        });
        break;
    }
  }

  /**
   *
   */
  updateMicroState(track) {
    let t = track || this.getLocalTrack(_a.audio);
    let muted = !this.startWithAudio;
    if (t && t.isActive()) {
      muted = t.isMuted();
    }
    if (muted) {
      this.__ctrlAudio.setState(0);
      this.__ctrlAudio.el.dataset.muted = 1;
    } else {
      this.__ctrlAudio.setState(1);
      this.__ctrlAudio.el.dataset.muted = 0;
    }
  }

  /**
   *
   */
  async attachSound(track) {
    let t = track || this.getLocalTrack(_a.audio);
    if (!t && t.stream && !t.isActive()) {
      sound.plug(t.stream);
    }
  }

  /**
   *
   */
  async getLocalParts() {
    let participants = await this.ensurePart("participants");
    let local = await participants.ensurePart("local-user");
    let video = await local.ensurePart(_a.video);
    let audio = await local.ensurePart(_a.audio);
    let sound = await local.ensurePart("sound");
    return { participants, local, video, audio, sound };
  }

  /**
   *
   * @param {*} avatarStatus
   * @param {*} videoStatus
   */
  async toggleAvatarVideo(avatarStatus, videoStatus) {
    let { local } = await this.getLocalParts();
    local.toggleAvatarVideo(avatarStatus, videoStatus);
    if (this.toggleVideoTrack) this.toggleVideoTrack(videoStatus);
  }

  /**
   *
   */
  checkQuota() {
    this.warn("DISABLED DUE TO BUSINESS CHANGE");
  }

  /**
   *
   * @param {*} peer
   */
  updateAttendees(peer) {
    if (!this.__attendees || !peer) return;
    delete peer.service;
    peer.kind = "webrtc_attendee";
    peer.drumate_id = peer.uid;
    peer.user_id = peer.uid;
    peer.online = 2;
    let attendees = this.__attendees.getItemsByAttr(_a.uid, peer.uid);
    if (_.isEmpty(attendees)) {
      this.__attendees.append(peer);
    } else {
      for (var a of attendees) {
        if (a.mget(_a.uid) == peer.uid && _.isFunction(a.update)) {
          a.update({ role: peer.role });
        }
        if (typeof a.callEnded === 'function') a.callEnded();
      }
    }
    this.stateMessage();
  }

  /**
   *
   */
  removePresenter(peer) {
    this.__ctrlScreen.el.setAttribute("data-muted", "0");
    setTimeout(() => {
      if (this.__ctrlScreen.el.dataset.muted != "0") {
        this.__ctrlScreen.el.setAttribute("data-muted", "0");
      }
    }, 2000);
    let presenter = this.__presenter.getItemsByAttr(
      "participant_id",
      peer.participant_id
    )[0];
    if (!presenter || presenter.isDestroyed()) return;
    presenter.goodbye();
    this.__presenter.clear();
    this.responsive("normal");
    this.change_size(0);
    this.isScreenShare = false;
  }

  /**
   *
   */
  removeAttendees(peer) {
    if (!peer) return;
    this.removePresenter(peer);
    if (this.mget(_a.area) == _a.private) return;
    let attendees = this.__attendees.getItemsByAttr(_a.uid, peer.uid);
    if (!_.isEmpty(attendees)) {
      for (var a of attendees) {
        a.suppress();
      }
    }
  }

  /**
   *
   */
  membersListApi() {
    // if (this.get(_a.attendees)) return null;
    return {
      service: SERVICE.hub.get_members_by_type,
      type: "all",
      hub_id: this.mget(_a.hub_id),
      timer: 500,
    };
  }

  /**
   *
   */
  initCommadPanel(args) {
    if (this.__ctrlAudio) {
      this.__ctrlAudio.el.dataset.muted = 0;
      this.__ctrlAudio.setState(1);
      this.__ctrlAudio.mset(_a.service, _a.settings);
      this.__ctrlAudio.el.dataset.disabled = 0;
    }
    if (this.__ctrlVideo) {
      this.__ctrlVideo.el.dataset.muted = 0;
      this.__ctrlVideo.mset(_a.service, _a.settings);
      this.__ctrlVideo.el.dataset.disabled = 0;
    }
    if (this.__ctrlScreen) {
      this.__ctrlScreen.el.dataset.muted = 0;
    }
  }

  /**
   *
   */
  async updateAudioDevicesList(refresh = 0) {
    let p = await this.ensurePart("audio-devices");
    let noDevice = [
      Skeletons.Note({
        className: `device-heading`,
        content: LOCALE.MICROPHONE,
      }),
      Skeletons.Note({
        className: `device-label`,
        content: "No input device",
      }),
    ];

    // Enumerate only AFTER permission is granted — otherwise the list rows carry
    // empty deviceIds and every pick silently fails on Save (see
    // ensureMediaPermission). Surface a clear note when it's denied.
    if (!(await this.ensureMediaPermission())) {
      p.feed([
        Skeletons.Note({
          className: `device-heading`,
          content: LOCALE.MICROPHONE,
        }),
        Skeletons.Note({
          className: `device-label`,
          content: LOCALE.MEDIA_BLOCKED_BY_BROWSER.format(
            LOCALE.MICROPHONE.toLowerCase(),
          ),
        }),
      ]);
      p.$el.fadeIn();
      return;
    }

    if (JitsiMeetJS.mediaDevices.isDeviceChangeAvailable("input")) {
      JitsiMeetJS.mediaDevices.enumerateDevices(async (devices) => {
        console.log(devices);
        const audioInputDevices = devices.filter(
          (d) => d.kind === "audioinput"
        );
        const audioOutputDevices = devices.filter(
          (d) => d.kind === "audiooutput"
        );
        const currentOutputDevice =
          await JitsiMeetJS.mediaDevices.getAudioOutputDevice();
        // Seed the highlighted row from the user's remembered pick first; only
        // fall back to the live track when there is no saved preference (first
        // open of the call). getDeviceId() honours _realDeviceId, unlike the
        // raw .deviceId property which can't round-trip the 'default' id.
        let currentInputDevice = this.preferredInputDevice || null;
        if (!currentInputDevice) {
          let audioTrack = this.room.getLocalAudioTrack();
          if (audioTrack) {
            currentInputDevice = audioTrack.getDeviceId
              ? audioTrack.getDeviceId()
              : audioTrack.deviceId;
          }
        }
        if (audioInputDevices.length > 0) {
          let view = require("../skeleton/device-list")(
            this,
            audioInputDevices,
            audioOutputDevices,
            currentInputDevice,
            this.preferredOutputDevice ||
              (currentOutputDevice && currentOutputDevice) ||
              "default"
          );
          p.feed(view);
        } else {
          p.feed(noDevice);
        }
        p.$el.fadeIn();
      });
    } else {
      p.feed(noDevice);
      p.$el.fadeIn();
    }
  }

  /**
   *
   */
  closeInputDevicesList() {
    let p = this.getPart("audio-devices");
    if (!p) return;
    p.$el.fadeOut();
    setTimeout(() => {
      p.clear();
    }, 1000);
  }

  /**
 * 
 */
  async displayPresentation(fullscreen) {
    if (fullscreen !== null) {
      if (fullscreen === 1) {
        await document.body.requestFullscreen();
        if (!this.savedGeometry) {
          this.savedGeometry = { ...this.$el.position(), width: this.$el.width(), height: this.$el.height() };
        }
        setTimeout(() => { this.fitScreenSize("presenter-full") }, 1000);
        return
      } else {
        if (document.fullscreenElement != null)
          if (document.fullscreen) await document.exitFullscreen();
      }
    }
    this.fitScreenSize("presenter");
  }

  /**
   *
   */
  onRemoteScreenStart(size) {
    this.videoSize = size;
    this.displayPresentation(null);
    this.stateMessage();
    this.__ctrlScreen.el.dataset.muted = 1;
    this.responsive("presenter");
    this.isScreenShare = true;
  }

  /**
   *
   */
  onRemoteScreenStop() {
    this.__presenter.clear();
    this.responsive("normal");
    this.change_size(0);
    this.isScreenShare = false;
    this.presenterId = null;
    setTimeout(() => {
      this.__ctrlScreen.el.dataset.muted = 0;
    }, 2000);
  }

  /**
   *
   */
  async recreateLocalTrackOnDeviceChange() {
    let reqDevices = [_a.audio];
    if (this.isVideo) reqDevices = [...reqDevices, _a.video];
    // replaceTrack inside createLocalTracks is async — await so the swap
    // completes deterministically before the promise settles.
    await this.createLocalTracks(reqDevices, this.selectedInputDevice);
  }

  /**
   * Apply the user's device selection deterministically: recreate the local
   * mic track (input) and set the output device, IN ORDER, then re-apply the
   * output sink to remote audio elements that were already attached. Doing
   * these concurrently (the old behaviour) raced the Jingle renegotiation and
   * the Jitsi `audioOutputChanged` flag — hence "no audio until the 2nd-3rd try".
   */
  /**
   * enumerateDevices() only fills in real deviceId + label once MICROPHONE
   * permission is granted; before that every row carries an EMPTY deviceId, so
   * picking a mic/speaker stores "" and Save silently no-ops on BOTH input and
   * output (the guards below skip a falsy id) — the "can't change voice setting,
   * no error" bug. Verify the grant is in place: query first, and only fall
   * back to a short-lived getUserMedia probe (which triggers the prompt and
   * refreshes the device ids/labels) when it isn't already granted.
   */
  async ensureMediaPermission() {
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const st = await navigator.permissions.query({ name: "microphone" });
        if (st && st.state === "granted") return true;
        if (st && st.state === "denied") return false;
      }
    } catch (e) {
      // 'microphone' not queryable on this browser — fall through to the probe.
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Release the probe stream immediately; the call keeps its own tracks.
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (e) {
      this.warn("media permission not granted", e);
      return false;
    }
  }

  // Actionable text for a local-media failure ("blocked in the browser" /
  // "no device" / "in use by another app"), see webrtc/media-error.
  mediaErrorMessage(error) {
    return mediaErrorMessage(error);
  }

  // Record a local-media failure and point the `mediaDenied` state at its real
  // cause. Callers that end the startup read `hasMediaError()` to pick the
  // terminal state.
  setMediaError(error) {
    this._mediaError = error || null;
    if (error) this.statusMessages.mediaDenied = this.mediaErrorMessage(error);
  }

  hasMediaError() {
    return !!this._mediaError;
  }

  async confirmDeviceSelection() {
    // Close the picker immediately (it only fades the part out; it does NOT
    // reset selected*), then serialize the device changes in the background.
    this.closeInputDevicesList();
    // Applying the change re-acquires the device (getUserMedia / setSinkId),
    // which needs permission — verify up front and fail LOUDLY, not silently.
    if (!(await this.ensureMediaPermission())) {
      Wm.alert(
        LOCALE.MEDIA_BLOCKED_BY_BROWSER.format(LOCALE.MICROPHONE.toLowerCase()),
      );
      return;
    }
    try {
      if (this.selectedInputDevice) {
        await this.recreateLocalTrackOnDeviceChange();
      }
      if (this.selectedOutputDevice) {
        await JitsiMeetJS.mediaDevices.setAudioOutputDevice(
          this.selectedOutputDevice
        );
        // setAudioOutputDevice only affects FUTURE attaches; remote audio
        // elements attached before the flag flipped keep their old sink.
        const sinkId = JitsiMeetJS.mediaDevices.getAudioOutputDevice();
        await this.reapplyRemoteAudioSink(sinkId);
      }
    } catch (e) {
      this.warn("confirmDeviceSelection failed", e);
      // Was silently swallowed before — surface it so a failed change isn't
      // mistaken for "nothing happened". The raw exception stays in the log;
      // the user gets the classified cause.
      Wm.alert(this.mediaErrorMessage(e));
    }
  }

  /**
   * Re-apply the chosen output device (setSinkId) to every already-attached
   * remote audio element. The global Jitsi flag only helps elements attached
   * after the change, so existing remotes need an explicit re-apply.
   */
  async reapplyRemoteAudioSink(deviceId) {
    try {
      const parts = await this.ensurePart("participants");
      if (!parts || !parts.children) return;
      parts.children.each((child) => {
        if (child && typeof child.reapplyAudioSink === "function") {
          child.reapplyAudioSink(deviceId);
        }
      });
    } catch (e) {
      this.warn("reapplyRemoteAudioSink failed", e);
    }
  }

  /**
   * 
   */
  openChat(cmd) {
    let opt = {
      kind: "window_channel",
      hub_id: this.mget(_a.hub_id),
      room_id: this.mget(_a.id),
      filename: this.mget(_a.filename),
      nid: this.mget(_a.actual_home_id),
      media: this.media,
      service_class: this.service_class,
      area: this.mget(_a.area),
      trigger: cmd,
      user: this.user,
      mode: this.mget(_a.status),
    };
    if (cmd.mget(_a.respawn)) {
      opt.kind = cmd.mget(_a.respawn);
      opt.tag = `${opt.kind}-${this.mget(_a.id)}`;
    }
    Wm.launch(opt, { explicit: 1, singleton: 1 });
  }

  /**
   * 
   */
  closeOnTimeout() {
    let quota = {
      type : 'conference',
      value : this.mget(_a.quota)
    }
    RADIO_MEDIA.trigger("quota:exceeded", quota);
    this.goodbye();
  }
  /**
   *
   */
  onUiEvent(cmd, args = {}) {
    let service = args.service || cmd.get(_a.service);
    let state = cmd.mget(_a.state);
    switch (service) {
      case "close-device-select":
        this.selectedInputDevice = null;
        this.selectedOutputDevice = null;
        this.closeInputDevicesList();
        break;
      case "confirm-device-selection":
        // Serialize the input recreate + output sink change (and re-apply the
        // output sink to already-attached remote audio). onUiEvent stays sync;
        // confirmDeviceSelection awaits the steps in order internally.
        this.confirmDeviceSelection();
        break;
      case "input-device-select":
        this.selectedInputDevice = cmd.$el.data("deviceid");
        // Remember the user's pick so reopening the popup re-highlights it.
        // The live-track readback alone can't round-trip the 'default'
        // pseudo-device id, so without this the selection appears to revert
        // to the first/Default row even though the mic actually changed.
        this.preferredInputDevice = this.selectedInputDevice;
        break;
      case "output-device-select":
        this.selectedOutputDevice = cmd.$el.data("deviceid");
        this.preferredOutputDevice = this.selectedOutputDevice;
        break;
      case "remote-ready":
        //this.checkQuota();
        this.updateAttendees(args);

        break;
      case "remote-gone":
        //this.checkQuota();
        this.removeAttendees(args);
        this.removePresenter(args);
        break;
      case "quota-timeout":
        this.closeOnTimeout();
        break;

      case "start-screenshare":
      case "stop-screenshare":
        this.changePresentation(state);
        break;

      case "start-remote-screen":
        this.onRemoteScreenStart(args.size);
        break;

      case "stop-remote-screen":
        this.onRemoteScreenStop();
        break;

      case "waiting-presentation":
        if (args.state) {
          let msg = LOCALE.WAITING_FOR_X.format(
            LOCALE.X_SCREEN.format(args.username)
          );
          this.stateMessage(msg);
        }
        //this.changePresentation(args);
        break;

      case "togglefullscreen":
        this.isFullScreen = this.isFullScreen ^ 1;
        this.displayPresentation(this.isFullScreen);
        break;

      case "device-setting":
        this.audioSettingsOpen = 1;
        if (this.__audioDevices && !this.__audioDevices.isEmpty()) {
          this.closeInputDevicesList();
          return;
        }
        this.updateAudioDevicesList();
        break;
      case _a.settings:
        let name = cmd.mget(_a.name);
        switch (name) {
          case _a.video:
            this.changeLocalVideo(state);
            break;
          case _a.audio:
            this.changeLocalAudio(state);
            break;
          default:
            return;
        }
        break;

      case _a.chat:
        this.openChat(cmd);
        break;

      case "watermark":
        this.__timerContainer.feed({
          kind: "countdown_timer",
          in: args.quota,
          service: "quota-timeout"
        })
        break;
      default:
        super.onUiEvent(cmd, args);
    }
  }

  /**
   *
   * @returns
   */
  async join(args) {
    this.stateMachine("joining");
    let opt = {
      socket_id: Visitor.get(_a.socket_id),
      nid: this.mget(_a.nid),
      room_id: this.mget(_a.room_id) || this.mget(_a.nid),
      hub_id: this.mget(_a.hub_id),
      metadata: this.metadata(),
      type: this.service_class,
      room_type: this.service_class,
      ...args,
    };

    let c = await this.postService(SERVICE.conference.join, opt);
    /**
     * A request that never completed resolves undefined: doRequest routes
     * network failures through onServerComplain without throwing. That is a
     * dead connection, not a rights problem, and reporting it as a weak
     * privilege sent users hunting for permissions they had all along.
     */
    if (!c) {
      this.stateMachine("unreachable");
      return null;
    }
    if (!c.user || !c.user.permission) {
      this.stateMachine("permissionDenied");
      return null;
    }

    this.hasStarted = 1;
    try {
      console.log("[ROOMDBG] conference.join result", {
        requested_room_id: opt.room_id, returned_room_id: c.user.room_id,
        nid: opt.nid, hub_id: opt.hub_id, role: c.user.role,
      });
    } catch (e) { }
    this.mset({ room_id: c.user.room_id });
    this.mset({ quota: parseInt(c.user.quota) });
    this.mset({ permission: c.user.permission });
    this.mset({ role: c.user.role });
    this.mset({ status: c.user.status });
    return c;
  }

  /**
   *
   * @param {*} data
   */
  onSettingsChange(data) {
    this.mset(data.name, data.state);
    switch (data.name) {
      case _a.video:
      case _a.screen:
        if (data.state) {
          this.hideAvatar();
        } else {
          this.showAvatar();
        }
        break;

      case _a.audio:
        let m = this.__muted || this.__micro;
        if (m) m.el.dataset.state = 1 ^ data.state;
    }
  }

  /**
   * @param {*} service
   * @param {*} data
   */
  onWebsocketError(data) {
    this.warn(__filename, data, this);
    this.triggerHandlers({ ...data, service: "webrtc-error" });
  }

  /**
   *
   */
  handleError() {
    if (this.isDestroyed()) return;
    this.stateMessage(LOCALE.CONNECTION_LOST);
    wsRouter.once(_e.connect, this.handleReconnect.bind(this)); //this._count.bind(this))
    RADIO_NETWORK.once(_e.online, () => {
      this.stateMessage();
    });
  }

  /**
   *
   */
  handleReconnect() {
    if (this.isDestroyed()) return;
    this.stateMessage(LOCALE.RECONNECTION_IN_PROGRESS);
    uiRouter.ensureWebsocket().then(() => {
      this.stateMessage("");
    });
  }

  /**
   *
   * @param {*} user
   * @param {*} service
   */
  stateMessage(s, timeout) {
    let message = this.statusMessages[s] || s;
    this.ensurePart("message-container").then((c) => {
      if (_.isEmpty(message)) {
        c.clear();
      } else {
        c.feed(
          Skeletons.Note({
            className: `message-text`,
            content: message,
          })
        );
        if (timeout) {
          setTimeout(() => {
            c.clear();
          }, timeout);
        }
      }
    });
  }

  /**
   *
   */
  hideCalleAvatar() {
    let _callAvatar = this.getPart("caller-callee-avatar");
    if (_callAvatar) {
      _callAvatar.el.style.display = "none";
    }
  }

  /**
   *
   * @returns
   */
  postOnlineState() {
    if (!Visitor.isOnline()) return;
    setTimeout(async () => {
      await this.postService(SERVICE.desk.set_online_status, {
        hub_id: Visitor.id,
      }, { async: 1 });
    }, 3000);
  }
}
module.exports = __webrtc_room;
