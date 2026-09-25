const JitsiMeetJS = require('vendor/lib/jitsi/lib-jitsi-meet.min.js');
const { timestamp } = require("@drumee/ui-essentials")
const { mediaErrorMessage, isMediaPermissionError } = require("builtins/webrtc/media-error");
const DevicePrefs = require("builtins/webrtc/device-prefs");

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
    this.selectedVideoDevice = "";
    // Start from the mic / speaker the user picked in an earlier meeting
    // (browser localStorage) instead of the OS default every time. The room
    // (webrtc/room/jitsi) checks the device is still plugged in before using
    // it; confirmDeviceSelection updates the memory on every confirmed pick.
    const prefs = DevicePrefs.load();
    this.preferredInputDevice = prefs.input;
    this.preferredOutputDevice = prefs.output;
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
   * The control widget for one media kind, whichever command bar is mounted
   * (meeting topbar, p2p call bar). Both bind the same sys_pn.
   */
  _mediaCtrl(kind) {
    // Only these two have a control. Jitsi can name others in gum.devices
    // (desktop), and those must not fall through to the microphone.
    if (kind !== _a.audio && kind !== _a.video) return null;
    const btn = kind === _a.video ? this.__ctrlVideo : this.__ctrlAudio;
    if (!btn || !btn.el || (btn.isDestroyed && btn.isDestroyed())) return null;
    return btn;
  }

  /**
   * Flag the mic / camera control as blocked by the browser or the OS.
   *
   * A muted mic and a BLOCKED mic look identical otherwise, so a user whose OS
   * silently denies the browser sees only a mic they think they can un-mute.
   * The warning rides as a corner BADGE rather than replacing the glyph: the
   * control has to keep reading as the mic / camera toggle it is, and a button
   * whose only glyph is a warning triangle no longer says what it toggles.
   *
   * The badge is a real sprite node rather than a CSS background so it stays on
   * the one icon pipeline, and it is pointer-events:none in the skin — ui-core
   * dispatches a widget's service only when the INNERMOST element under the
   * pointer carries it, so a hit-testable child would swallow clicks on the
   * toggle.
   */
  _setMediaDeniedUi(kind, denied) {
    if (kind !== _a.audio && kind !== _a.video) return;
    // Recorded as well as applied: the startup media failure is classified
    // before the command bar exists, so the flag has to survive until
    // initCommadPanel can put it on screen (see _applyMediaDeniedUi).
    this._mediaDenied = this._mediaDenied || {};
    this._mediaDenied[kind] = !!denied;
    const btn = this._mediaCtrl(kind);
    if (!btn) return;
    const existing = btn.el.querySelector(".media-denied-badge");
    if (denied) {
      if (!existing) {
        const badge = document.createElement("div");
        badge.className = "media-denied-badge";
        badge.innerHTML =
          '<svg xmlns="http://www.w3.org/2000/svg">' +
          '<use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#--icon-apps-warning"></use>' +
          "</svg>";
        btn.el.appendChild(badge);
      }
      // Single-word key on purpose: dataset keys are written verbatim, a
      // multi-word one would never match the CSS hook.
      btn.el.dataset.denied = 1;
    } else {
      if (existing) existing.remove();
      btn.el.dataset.denied = 0;
    }
    // Gate the toggle itself: there is nothing to un-mute while the device is
    // blocked, and a toggle that answers a click by doing nothing reads as a
    // broken button. _setService is the room's existing enable/disable idiom
    // (null service + data-disabled), so this control behaves like every other
    // locked one. The CARET beside it stays live on purpose — opening the
    // guidance panel is the way out of this state.
    this._setService(kind === _a.video ? "ctrl-video" : "ctrl-audio",
      denied ? null : _a.settings);
  }

  /** Put the recorded denied flags back on the controls once they exist. */
  _applyMediaDeniedUi() {
    const flags = this._mediaDenied || {};
    Object.keys(flags).forEach((kind) => {
      if (flags[kind]) this._setMediaDeniedUi(kind, true);
    });
  }

  /**
   * The permission as the browser reports it RIGHT NOW, query only — no
   * getUserMedia probe, because this runs on the mute path too and muting a
   * device must never open it. null means "not queryable here" (Firefox),
   * which is unknown, not granted.
   */
  async _mediaPermissionState(kind) {
    if (!navigator.permissions || !navigator.permissions.query) return null;
    try {
      const st = await navigator.permissions.query({
        name: kind === _a.video ? "camera" : "microphone",
      });
      return (st && st.state) || null;
    } catch (e) {
      // Name not queryable on this browser.
      return null;
    }
  }

  /**
   * Is this toggle click landing on a device the browser or OS has blocked?
   *
   * Asked BEFORE the toggle picks a branch, because only one branch could ever
   * find out. With the control ON, the first click means MUTE, and the mute
   * path never attempts capture: the revoked track has ended, but nothing
   * there inspects it and its `enabled` flag still flips, so mute() succeeds
   * in silence and the control simply turns off. Only the NEXT click — the one
   * that has to re-acquire the device — reaches getUserMedia and throws. That
   * is the "two clicks to reach denied" bug. Asking the browser up front makes
   * the FIRST click land on it, whichever way the toggle was pointing.
   * (Verified in Chromium: after a revoke the track reads "ended", the enabled
   * flag still flips, and a query-only permissions read already says
   * "denied".)
   */
  async _blockedOnToggle(kind) {
    if ((await this._mediaPermissionState(kind)) !== "denied") return false;
    this._setMediaDeniedUi(kind, true);
    this._resetMediaControl(kind);
    return true;
  }

  /** Put a control back to "off" after its device failed or went away. */
  _resetMediaControl(kind) {
    const btn = this._mediaCtrl(kind);
    if (btn) {
      btn.setState(0);
      btn.el.dataset.muted = 1;
    }
    if (kind === _a.video) {
      this.isVideo = false;
      // The tile has to fall back to the avatar; the camera is not coming.
      this.toggleAvatarVideo(1, 0);
    } else {
      this.isAudio = false;
    }
  }

  /**
   * A mic / camera toggle that failed to turn the device ON.
   *
   * This is the moment a user is MOST likely to meet the block, and it was the
   * one path that said nothing: the pickers call ensureMediaPermission() and
   * raise the denied UI, but the toggle just let getUserMedia reject — audio
   * not at all (onUiEvent does not await it, so it became an unhandled
   * rejection) and video into a catch that only reverted the button. Hence
   * "the badge appears when I click the caret but not the toggle".
   */
  _onMediaToggleFailed(kind, error) {
    this.warn("media toggle failed", kind, error);
    // Classified for THIS control only — a failed mic must not brand the
    // camera as blocked.
    this.setMediaError(error, [kind]);
    if (!isMediaPermissionError(error)) {
      // Busy or unplugged is transient: report it, but leave the toggle
      // usable, or the user is locked out of a device that may come back.
      this.mediaAlert(this.mediaErrorMessage(error));
    }
    // Never leave the control lit as though the device had come on.
    this._resetMediaControl(kind);
  }

  /**
   * "Retry" in the guidance panel: re-check the permission and, once it is
   * granted, swap the panel for the real device list in place — the user
   * should not have to close and reopen the picker to find out whether the
   * setting they just changed took effect. A browser that has BLOCKED the site
   * will not re-prompt, so this is a re-read of the permission state, not a
   * second request.
   */
  async retryMediaPermission(kind = _a.audio, cmd) {
    const isVideo = kind === _a.video;
    const part = this.getPart(isVideo ? "video-devices" : "audio-devices");
    // The check can pause on a getUserMedia probe (ensureMediaPermission falls
    // back to one where the permission is not queryable), so the button says
    // it is working rather than looking ignored.
    if (cmd && cmd.el) cmd.el.dataset.loading = 1;
    let granted;
    try {
      granted = await this.ensureMediaPermission(isVideo ? _a.video : _a.audio);
    } finally {
      // On success the part is re-fed below and this element is discarded;
      // clearing a detached node's flag is harmless.
      if (cmd && cmd.el) cmd.el.dataset.loading = 0;
    }
    this._setMediaDeniedUi(isVideo ? _a.video : _a.audio, !granted);
    if (!granted) {
      // Still blocked. Mark the button rather than doing nothing — a silent
      // no-op reads as a dead click and sends people back to the caret.
      if (part && part.$el) {
        part.$el.find(".media-blocked-retry").attr("data-error", 1);
      }
      return;
    }
    // clear() first: feed() appends, so without it the device list would land
    // underneath the guidance panel it is meant to replace.
    if (part) part.clear();
    if (isVideo) return this.updateVideoDevicesList();
    return this.updateAudioDevicesList();
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
    // Last: the resets above put the normal glyphs back via setState/mould.
    this._applyMediaDeniedUi();
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
        content: LOCALE.NO_INPUT_DEVICE,
      }),
    ];

    // Enumerate only AFTER permission is granted — otherwise the list rows carry
    // empty deviceIds and every pick silently fails on Save (see
    // ensureMediaPermission). When it's denied the picker shows the guidance
    // panel (browser AND operating-system steps) instead of the device list.
    if (!(await this.ensureMediaPermission(_a.audio))) {
      this._setMediaDeniedUi(_a.audio, true);
      // Stamp the wrapper so the skin can widen it for the guidance text; a
      // structural selector would be at the mercy of the panel's markup.
      p.el.dataset.blocked = 1;
      p.feed(require("../skeleton/media-blocked")(this, _a.audio));
      p.$el.fadeIn();
      return;
    }
    p.el.dataset.blocked = 0;
    this._setMediaDeniedUi(_a.audio, false);

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
   * Camera twin of updateAudioDevicesList: enumerate video inputs (after the
   * camera permission is granted) and feed the picker into the "video-devices"
   * wrapper on the camera pill. Camera has no output-sink half, so only the
   * videoinput side is built.
   */
  async updateVideoDevicesList(refresh = 0) {
    let p = await this.ensurePart("video-devices");
    let noDevice = [
      Skeletons.Note({
        className: `device-heading`,
        content: LOCALE.CAMERA,
      }),
      Skeletons.Note({
        className: `device-label`,
        content: LOCALE.NO_CAMERA_DEVICE,
      }),
    ];

    // Enumerate only AFTER permission is granted — otherwise the list rows carry
    // empty deviceIds and every pick silently fails on Save (see
    // ensureMediaPermission). When it's denied the picker shows the guidance
    // panel (browser AND operating-system steps) instead of the device list.
    if (!(await this.ensureMediaPermission(_a.video))) {
      this._setMediaDeniedUi(_a.video, true);
      // Stamp the wrapper so the skin can widen it for the guidance text; a
      // structural selector would be at the mercy of the panel's markup.
      p.el.dataset.blocked = 1;
      p.feed(require("../skeleton/media-blocked")(this, _a.video));
      p.$el.fadeIn();
      return;
    }
    p.el.dataset.blocked = 0;
    this._setMediaDeniedUi(_a.video, false);

    if (JitsiMeetJS.mediaDevices.isDeviceChangeAvailable("input")) {
      JitsiMeetJS.mediaDevices.enumerateDevices(async (devices) => {
        const videoInputDevices = devices.filter(
          (d) => d.kind === "videoinput"
        );
        // Seed the highlighted row from the user's remembered pick first; only
        // fall back to the live track when there is no saved preference (first
        // open of the call). getDeviceId() honours _realDeviceId, unlike the
        // raw .deviceId property.
        let currentInputDevice = this.preferredVideoInputDevice || null;
        if (!currentInputDevice && this.room) {
          let videoTrack = this.room.getLocalVideoTrack();
          if (videoTrack) {
            currentInputDevice = videoTrack.getDeviceId
              ? videoTrack.getDeviceId()
              : videoTrack.deviceId;
          }
        }
        if (videoInputDevices.length > 0) {
          let view = require("../skeleton/video-device-list")(
            this,
            videoInputDevices,
            currentInputDevice
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
  closeVideoDevicesList() {
    // The effects panel hangs off the same picker — close it alongside.
    this.closeBgEffectsPanel();
    let p = this.getPart("video-devices");
    if (!p) return;
    p.$el.fadeOut();
    setTimeout(() => {
      p.clear();
    }, 1000);
  }

  /**
   * The current background effect: { type: "none"|"blur"|"image", level?,
   * id?, image? }. `bgEffect` is the source of truth; applyBackgroundEffect
   * attaches it to the live camera track and is re-run after the camera is
   * (re)created (enable / device switch) so the effect survives those.
   */
  setBackgroundEffect(spec, cmd) {
    this.bgEffect = spec || { type: "none" };
    this._syncBgUi();
    // Turning an effect ON needs a live camera track. Key off the actual track,
    // not this.isVideo (which can be stale either way): with no track, applying
    // silently no-ops, so auto-enable the camera — changeLocalVideo's enable
    // path re-applies the current bgEffect once the new track exists.
    const hasCamera = !!(this.room && this.room.getLocalVideoTrack
      && this.room.getLocalVideoTrack());
    if (this.bgEffect.type !== "none" && !hasCamera) {
      return this.enableCameraForEffect();
    }
    return this.applyBackgroundEffect();
  }

  /** Turn the camera on so a just-selected background effect has a track. */
  async enableCameraForEffect() {
    if (this.__ctrlVideo) this.__ctrlVideo.setState(1);
    await this.changeLocalVideo(1);
  }

  /** Blur Background row in the device list — toggles blur on/off. */
  async toggleBackgroundBlur(cmd) {
    const on = !(this.bgEffect && this.bgEffect.type === "blur");
    await this.setBackgroundEffect(on ? { type: "blur", level: "light" } : { type: "none" }, cmd);
  }

  /**
   * The Blur toggle exists in TWO places at once — the device-list "Blur
   * Background" row (.blur-background-ctrl) and the effects-panel blur tile
   * (.bg-effect-tile.blur) — likewise Upload/image (.upload-background-ctrl /
   * .bg-effect-tile.upload). Collect the matching elements across whichever of
   * the two popups are currently open so their active/loading state stays in
   * sync no matter which one was clicked.
   */
  _bgFind(selector) {
    const res = [];
    ["video-devices", "bg-effects"].forEach((n) => {
      const p = this.getPart && this.getPart(n);
      if (p && p.$el && p.$el.find) {
        const f = p.$el.find(selector);
        if (f && f.length) res.push(f);
      }
    });
    return res;
  }

  /**
   * Reflect this.bgEffect on the controls: blur controls active when blurring;
   * the active image's preview thumbnail active when an image is applied. The
   * Upload (+) tile is an "add" button and never shows active.
   */
  _syncBgUi() {
    const e = this.bgEffect || { type: "none" };
    this._bgFind(".blur-background-ctrl, .bg-effect-tile.blur")
      .forEach((f) => f.attr("data-state", e.type === "blur" ? 1 : 0));
    const id = e.type === "image" ? String(e.id) : null;
    this._bgFind(".bg-effect-tile.thumb").forEach((set) =>
      set.each(function () {
        this.setAttribute(
          "data-state", this.getAttribute("data-bgid") === id ? "1" : "0"
        );
      })
    );
  }

  /**
   * Effect status → loading spinner on the control(s) for the active effect.
   * "loading" while the segmentation model downloads (a few seconds on first
   * use), cleared on "ready" (first processed frame) or "failed".
   */
  _onBgStatus(status) {
    const loading = status === "loading" ? 1 : 0;
    const e = this.bgEffect || { type: "none" };
    const sel = e.type === "image"
      ? `.bg-effect-tile.thumb[data-bgid="${e.id}"]`
      : ".blur-background-ctrl, .bg-effect-tile.blur";
    this._bgFind(sel).forEach((f) => f.attr("data-loading", loading));
  }

  /**
   * Attach / detach the MediaPipe background effect on the local camera track to
   * match this.bgEffect. No-ops (but keeps the spec) when the camera is off —
   * changeLocalVideo / recreateLocalVideoOnDeviceChange call this again once a
   * fresh track exists. A new effect instance is created per apply so its
   * canvas/segmenter don't leak across tracks.
   */
  async applyBackgroundEffect() {
    const track = this.room && this.room.getLocalVideoTrack();
    if (!track || !track.setEffect) return;
    const spec = this.bgEffect || { type: "none" };
    try {
      if (spec.type && spec.type !== "none") {
        const BackgroundEffect = require("./effects/background-effect");
        this._bgFx = new BackgroundEffect({
          type: spec.type,
          blurValue: spec.level === "strong" ? 18 : 8,
          image: spec.image,
          onStatus: (s) => this._onBgStatus(s),
        });
        await track.setEffect(this._bgFx);
      } else {
        await track.setEffect(undefined);
        this._bgFx = null;
        this._onBgStatus("ready"); // clear any lingering spinner
      }
    } catch (e) {
      this.warn("applyBackgroundEffect failed", e);
      this._onBgStatus("failed");
    }
  }

  /** Open (or refresh) the backgrounds & effects panel next to the list. */
  async updateBgEffectsPanel() {
    const p = await this.ensurePart("bg-effects");
    if (!p) return;
    const view = require("../skeleton/bg-effects")(this, {
      current: this.bgEffect || { type: "none" },
      backgrounds: (this.backgrounds || []).map((b) => ({ id: b.id, url: b.url })),
    });
    p.feed(view);
    p.$el.fadeIn();
  }

  /**
   *
   */
  closeBgEffectsPanel() {
    const p = this.getPart("bg-effects");
    if (!p) return;
    p.$el.fadeOut();
    setTimeout(() => p.clear(), 1000);
  }

  /**
   * Prompt for an image file, register it as a selectable background and apply
   * it immediately. Object URLs are kept for the call's lifetime (revoked on
   * teardown) so the thumbnail and the effect can both reference them.
   */
  pickBackgroundImage(cmd) {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.addEventListener("change", () => {
      const file = input.files && input.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = async () => {
        const id = `bg-${(this.backgrounds || []).length + 1}-${file.size}`;
        this.backgrounds = this.backgrounds || [];
        this.backgrounds.push({ id, url, img });
        // Mark it current + render the thumbnail (active) FIRST, so the async
        // "applying" loading spinner (_onBgStatus) has a DOM target on the new
        // tile, then apply the effect — the spinner shows on it until ready.
        this.bgEffect = { type: "image", id, image: img };
        await this.updateBgEffectsPanel();
        this.setBackgroundEffect({ type: "image", id, image: img }, cmd);
      };
      img.src = url;
    });
    input.click();
  }

  /**
   * Remove an uploaded background (its hover close badge). Drops it from the
   * list, frees its object URL, turns the effect off if it was the active one,
   * then re-renders the panel row.
   */
  removeBackground(cmd) {
    const id = cmd && cmd.$el && cmd.$el.data("bgid");
    if (id == null) return;
    const list = this.backgrounds || [];
    const idx = list.findIndex((b) => String(b.id) === String(id));
    if (idx < 0) return;
    const [removed] = list.splice(idx, 1);
    if (removed && removed.url) {
      try { URL.revokeObjectURL(removed.url); } catch (e) { /* already freed */ }
    }
    // If the removed image was the active background, drop the effect.
    if (this.bgEffect && this.bgEffect.type === "image"
        && String(this.bgEffect.id) === String(id)) {
      this.setBackgroundEffect({ type: "none" });
    }
    this.updateBgEffectsPanel();
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
    // A pending pick wins; otherwise keep the remembered mic. This also runs
    // on DEVICE_LIST_CHANGED (headset plugged / unplugged), where nothing was
    // picked: without the fallback the recreate handed an empty id to
    // getUserMedia and silently moved the call back to the OS default mic.
    const micId =
      this.selectedInputDevice || this.preferredInputDevice || "default";
    // The new mic must keep the CURRENT track's mute state: a fresh
    // getUserMedia track is live, and swapping it in unmuted behind an "off"
    // mic button is a hot mic. Read the state off the track itself, not the
    // isAudio flag — that flag can lag the track (a room launched without an
    // explicit audio option starts with isAudio false and a live mic).
    const current = this.getLocalTrack(_a.audio);
    const muted = !!(current && current.isMuted());
    // Keep the user's chosen camera when this path rebuilds the video track
    // (mic change / hardware hotplug) — otherwise it silently reverts to the
    // default camera.
    const createOpt = { muted };
    if (this.preferredVideoInputDevice) {
      createOpt.cameraDeviceId = this.preferredVideoInputDevice;
    }
    // replaceTrack inside createLocalTracks is async — await so the swap
    // completes deterministically before the promise settles.
    await this.createLocalTracks(reqDevices, micId, createOpt);
  }

  /**
   * Camera twin of recreateLocalTrackOnDeviceChange: rebuild the local video
   * track on the chosen camera. Threaded through createLocalTracks' createOpt
   * (cameraDeviceId), since the 2nd positional arg is the mic device id.
   */
  async recreateLocalVideoOnDeviceChange() {
    await this.createLocalTracks(_a.video, "default", {
      cameraDeviceId: this.selectedVideoDevice,
    });
    // The new track has no effect attached — re-apply the background effect.
    if (this.bgEffect && this.bgEffect.type && this.bgEffect.type !== "none") {
      await this.applyBackgroundEffect();
    }
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
  async ensureMediaPermission(kind = _a.audio) {
    const isVideo = kind === _a.video;
    const permName = isVideo ? "camera" : "microphone";
    const constraints = isVideo ? { video: true } : { audio: true };
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const st = await navigator.permissions.query({ name: permName });
        if (st && st.state === "granted") return true;
        if (st && st.state === "denied") return false;
      }
    } catch (e) {
      // Permission name not queryable on this browser — fall through to the probe.
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // Release the probe stream immediately; the call keeps its own tracks.
      stream.getTracks().forEach((t) => t.stop());
      return true;
    } catch (e) {
      this.warn("media permission not granted", e);
      return false;
    }
  }

  /**
   * Report a local-media failure as a dialog, closing whichever device picker
   * is open first.
   *
   * The pickers hang off the topbar carets, so an alert raised while one is
   * open leaves it on screen underneath — still listing devices the user has
   * just been told they cannot open, and still offering a Save that will fail
   * the same way. Every media alert goes through here so no future call site
   * has to remember; both closes are no-ops when the picker is not mounted.
   */
  mediaAlert(message) {
    this.closeInputDevicesList();
    this.closeVideoDevicesList();
    Wm.alert(message);
  }

  // Actionable text for a local-media failure ("blocked in the browser" /
  // "no device" / "in use by another app"), see webrtc/media-error.
  mediaErrorMessage(error) {
    return mediaErrorMessage(error);
  }

  // Record a local-media failure and point the `mediaDenied` state at its real
  // cause. Callers that end the startup read `hasMediaError()` to pick the
  // terminal state.
  /**
   * @param {*} error     the getUserMedia / lib-jitsi-meet failure
   * @param {string[]} [kinds]  which controls it applies to. Pass this when
   *   the caller KNOWS — a failed mic toggle must not flag the camera as
   *   blocked, and gum.devices is often absent on that path, which would
   *   otherwise fall back to flagging both.
   */
  setMediaError(error, kinds) {
    this._mediaError = error || null;
    if (!error) return;
    this.statusMessages.mediaDenied = this.mediaErrorMessage(error);
    // A blocked device has to say so on the control itself. The status line is
    // dismissed and then a muted-looking mic is all that is left — which is
    // exactly the state a user cannot diagnose.
    if (!isMediaPermissionError(error)) return;
    // Jitsi records which devices the failed request was for; when it does
    // not, and the caller named none, the request covered both.
    const devices = kinds || (error.gum && error.gum.devices) || [_a.audio, _a.video];
    devices.forEach((d) => this._setMediaDeniedUi(d, true));
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
    if (!(await this.ensureMediaPermission(_a.audio))) {
      this._setMediaDeniedUi(_a.audio, true);
      this.mediaAlert(
        LOCALE.MEDIA_BLOCKED_BY_BROWSER.format(LOCALE.MICROPHONE.toLowerCase()),
      );
      return;
    }
    this._setMediaDeniedUi(_a.audio, false);
    try {
      if (this.selectedInputDevice) {
        await this.recreateLocalTrackOnDeviceChange();
        // Remember only a pick that actually took (the recreate above throws
        // when the device cannot be opened), so the next meeting starts on
        // this microphone instead of the OS default.
        DevicePrefs.saveInput(this.selectedInputDevice);
        if (typeof this.postAudioDiagnostics === "function") {
          this.postAudioDiagnostics("input-device-changed");
        }
      }
      if (this.selectedOutputDevice) {
        await JitsiMeetJS.mediaDevices.setAudioOutputDevice(
          this.selectedOutputDevice
        );
        DevicePrefs.saveOutput(this.selectedOutputDevice);
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
      this.mediaAlert(this.mediaErrorMessage(e));
    }
  }

  /**
   * Camera twin of confirmDeviceSelection. Closes the picker, re-checks the
   * camera permission, then recreates the local video track on the chosen
   * device — but only when the camera is currently ON. When it's off the pick
   * is just remembered (preferredVideoInputDevice) and applied on next enable,
   * so confirming a camera doesn't force the camera on.
   */
  async confirmCameraSelection() {
    this.closeVideoDevicesList();
    if (!(await this.ensureMediaPermission(_a.video))) {
      this._setMediaDeniedUi(_a.video, true);
      this.mediaAlert(LOCALE.MEDIA_BLOCKED_BY_BROWSER.format(LOCALE.CAMERA.toLowerCase()));
      return;
    }
    this._setMediaDeniedUi(_a.video, false);
    try {
      if (this.selectedVideoDevice && this.isVideo) {
        await this.recreateLocalVideoOnDeviceChange();
      }
    } catch (e) {
      this.warn("confirmCameraSelection failed", e);
      // Classified cause, like the mic path — a failed camera switch must not
      // read as "nothing happened".
      this.mediaAlert(this.mediaErrorMessage(e));
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
      case "close-camera-select":
        this.selectedVideoDevice = null;
        this.closeVideoDevicesList();
        break;
      case "confirm-camera-selection":
        this.confirmCameraSelection();
        break;
      case "video-device-select":
        this.selectedVideoDevice = cmd.$el.data("deviceid");
        // Remember the pick so reopening re-highlights it and toggling the
        // camera off/on re-acquires this device (see changeLocalVideo).
        this.preferredVideoInputDevice = this.selectedVideoDevice;
        break;
      // The user fixed the permission and came back — re-check it and swap the
      // guidance panel for the real device list, so they don't have to close
      // and reopen the picker to find out whether it took.
      case "retry-media-permission":
        this.retryMediaPermission(cmd.$el.data("kind"), cmd);
        break;
      case "blur-background":
        this.toggleBackgroundBlur(cmd);
        break;
      case "upload-background":
        // Open the backgrounds & effects panel beside the device list.
        this.updateBgEffectsPanel();
        break;
      // ── Backgrounds & effects panel tiles ──────────────────────────────
      case "bg-none":
        this.setBackgroundEffect({ type: "none" }, cmd);
        break;
      case "bg-blur":
        // Panel blur tile toggles on/off, same as the device-list blur row.
        this.toggleBackgroundBlur(cmd);
        break;
      case "bg-upload":
        this.pickBackgroundImage(cmd);
        break;
      case "bg-select": {
        // Toggle: clicking the active background image turns it off; clicking
        // another applies it. (The × badge fully removes it from the row.)
        const id = cmd.$el.data("bgid");
        const isActive = this.bgEffect && this.bgEffect.type === "image"
          && String(this.bgEffect.id) === String(id);
        if (isActive) {
          this.setBackgroundEffect({ type: "none" }, cmd);
        } else {
          const bg = (this.backgrounds || []).find((b) => String(b.id) === String(id));
          if (bg) this.setBackgroundEffect({ type: "image", id, image: bg.img }, cmd);
        }
        break;
      }
      case "bg-remove":
        this.removeBackground(cmd);
        break;
      case "close-bg-effects":
        this.closeBgEffectsPanel();
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
        // Only one picker open at a time — close the camera list if it's showing.
        this.closeVideoDevicesList();
        if (this.__audioDevices && !this.__audioDevices.isEmpty()) {
          this.closeInputDevicesList();
          return;
        }
        this.updateAudioDevicesList();
        break;
      case "camera-setting":
        this.cameraSettingsOpen = 1;
        // Only one picker open at a time — close the mic list if it's showing.
        this.closeInputDevicesList();
        if (this.__videoDevices && !this.__videoDevices.isEmpty()) {
          this.closeVideoDevicesList();
          return;
        }
        this.updateVideoDevicesList();
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
      if (this.isDestroyed()) return;
      this.stateMessage("");
      // The offline listener is a `once`: re-arm it, or only the first drop
      // of a meeting would ever be noticed.
      RADIO_NETWORK.once(_e.offline, this.handleError.bind(this));
      // Reconnecting the socket alone does not bring us back into the room
      // (see jitsi onSignalingReconnected).
      if (typeof this.onSignalingReconnected === "function") {
        this.onSignalingReconnected();
      }
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
