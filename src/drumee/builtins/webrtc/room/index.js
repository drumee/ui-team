const JitsiMeetJS = require('vendor/lib/jitsi/lib-jitsi-meet.min.js');
const { timestamp } = require("core/utils")

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
      permissionDenied: LOCALE.WEAK_PRIVILEGE,
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
    document.removeEventListener(
      "fullscreenchange",
      this.onFullScreenChange.bind(this)
    );
    try {
      super.onBeforeDestroy();
    } catch (e) { }
    this.leaveRoom();
    if (this.watchdog) {
      clearInterval(this.watchdog);
    }
  }

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
   *
   */
  stateMachine(s, data) {
    this.state = s;
    switch (s) {
      case "online":
        this.isOnine = 1;
        this.mset({ start_at: timestamp() });
        if (this.watchdog) return;
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
    this.__ctrlAudio.el.dataset.muted = 0;
    this.__ctrlVideo.el.dataset.muted = 0;
    this.__ctrlScreen.el.dataset.muted = 0;
    this.__ctrlAudio.setState(1);
    this.__ctrlAudio.mset(_a.service, _a.settings);
    this.__ctrlVideo.mset(_a.service, _a.settings);
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
        let currentInputDevice = null;
        let audioTrack = this.room.getLocalAudioTrack();
        if (audioTrack) {
          currentInputDevice = audioTrack.deviceId;
        }
        if (audioInputDevices.length > 0) {
          let view = require("../skeleton/device-list")(
            this,
            audioInputDevices,
            audioOutputDevices,
            currentInputDevice,
            (currentOutputDevice && currentOutputDevice) || "default"
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
        console.log(fullscreen, "CHECK_FULLSCREEN_ENTER");
        await document.body.requestFullscreen();
        if (!this.savedGeometry) {
          this.savedGeometry = { ...this.$el.position(), width: this.$el.width(), height: this.$el.height() };
        }
        setTimeout(() => { this.fitScreenSize("presenter-full") }, 1000);
        return
      } else {
        console.log(fullscreen, "CHECK_FULLSCREEN_EXIT");
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
  recreateLocalTrackOnDeviceChange() {
    let reqDevices = [_a.audio];
    if (this.isVideo) reqDevices = [...reqDevices, _a.video];
    this.createLocalTracks(reqDevices, this.selectedInputDevice);
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
        if (this.selectedInputDevice) {
          this.recreateLocalTrackOnDeviceChange();
        }
        if (this.selectedOutputDevice) {
          JitsiMeetJS.mediaDevices.setAudioOutputDevice(
            this.selectedOutputDevice
          );
        }
        this.closeInputDevicesList();
        break;
      case "input-device-select":
        this.selectedInputDevice = cmd.$el.data("deviceid");
        break;
      case "output-device-select":
        this.selectedOutputDevice = cmd.$el.data("deviceid");
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
    if (!c || !c.user || !c.user.permission) {
      this.stateMachine("permissionDenied");
      return null;
    }

    this.hasStarted = 1;
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
