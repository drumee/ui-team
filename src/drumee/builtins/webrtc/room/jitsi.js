let CAMERA = "camera";
const JitsiMeetJS = require('vendor/lib/jitsi/lib-jitsi-meet.min.js');
const { events: JEVENTS } = JitsiMeetJS;
const { fitBoxes } = require("core/utils")

const __room = require(".");

class __webrtc_room extends __room {
  constructor(...args) {
    super(...args);
    this.onConnectionSuccess = this.onConnectionSuccess.bind(this);
    this.onConnectionFailed = this.onConnectionFailed.bind(this);
    this.createLocalTracks = this.createLocalTracks.bind(this);
    this.onStreamReceived = this.onStreamReceived.bind(this);
    this.onTrackRemoved = this.onTrackRemoved.bind(this);
    this.onUserLeft = this.onUserLeft.bind(this);
    this.onDeviceListChanged = this.onDeviceListChanged.bind(this);
    this.onLocalUserJoined = this.onLocalUserJoined.bind(this);
    this.broadcastJoining = this.broadcastJoining.bind(this);
    this.onRemoteUserJoined = this.onRemoteUserJoined.bind(this);
    this.onStatsReceived = this.onStatsReceived.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.onTrackMuteChange = this.onTrackMuteChange.bind(this);
    this.onLocaAudioStopped = this.onLocaAudioStopped.bind(this);
    this.onPermissionPrompted = this.onPermissionPrompted.bind(this);
    this.onWrongState = this.onWrongState.bind(this);
    this.stopPresentation = this.stopPresentation.bind(this);
    this.loadRemotePresentation = this.loadRemotePresentation.bind(this);
    this.leaveRoom = this.leaveRoom.bind(this);
  }

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt = {}) {
    super.initialize(opt);
    if (!this.service_class) this.warn("service_class should not be empty");
    this.bindEvent(
      _a.live,
      this.service_class,
      "signaling",
      "signaling.notify"
    );
    window.addEventListener("unload", this.leaveRoom);

    document.addEventListener(
      "fullscreenchange",
      this.onFullScreenChange.bind(this)
    );

    this.model.atLeast({
      role: "attendee",
    });
    this.roomInfoSvc = opt.info_service || SERVICE.conference.get;
    this._queue = [];
    this.media = opt.media;
    this._retry = 0;
    this.publishStreamId = null;
    this.sharePublishStreamId = null;
    this.streamsList = [];
    this.streamsInfoList = [];
    this.dataChannelOpen = false;
    this.roomName = null;

    this.isScreenShare = false;
    this.presenterId = null;
    this.endpoints = {};
    this.isVideo = this.mget(_a.video) == 1;
    this.isAudio = this.mget(_a.audio) == 1;
    this.room = null;
    this.connection = null;
    this.isJoined = false;
    this.localTracks = {};
    this.startWithAudio = true;
    this.idleStreams = [];
    this._kicked = {};
    this._guests = new Map();
  }

  /**
   *
   */
  bindConferenceRoom(room = {}) {
    let { configs } = room;
    if (!configs || !configs.domain) {
      throw ("Conference server has not been properly set up");
    }
    this.debug("ORIGIN CONFIGS", configs)
    const options = {
      init: require("./configs/init")(),
      connection: require("./configs/connection")(configs),
    }
    this.debug("TEST CONFIGS", configs)
    this.conferenceConfig = require("./configs/conference")(configs);

    return new Promise(async (resolve, reject) => {
      if (this.connection) {
        this.warn("A connection already rexists");
        return resolve();
      }

      JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.WARN);
      JitsiMeetJS.init(options.init);
      try {
        this.connection = new JitsiMeetJS.JitsiConnection(
          null,
          null,
          options.connection
        );
      } catch (e) {
        this.warn(e);
        return reject(e);
      }

      this.connection.addEventListener(
        JEVENTS.connection.CONNECTION_ESTABLISHED,
        (args) => {
          this.onConnectionSuccess();
          resolve();
        }
      );
      this.connection.addEventListener(
        JEVENTS.connection.CONNECTION_FAILED,
        this.onConnectionFailed
      );

      this.connection.addEventListener(
        JEVENTS.connection.CONNECTION_DISCONNECTED,
        this.disconnect
      );

      this.connection.addEventListener(
        JEVENTS.connection.WRONG_STATE,
        this.onWrongState
      );
      let { auth, domain } = configs || {};
      let id = `${auth[0]}@${domain}`;
      const password = auth[1];
      this.connection.connect({ id, password });
    });
  }

  /**
   * That function is called when connection is established successfully
   */
  onConnectionSuccess() {
    let room_id = this.mget(_a.room_id);
    this.room = this.connection.initJitsiConference(
      room_id,
      this.conferenceConfig
    );
    this.setLocalUserInfo();
    this.room.on(JEVENTS.conference.TRACK_ADDED, this.onStreamReceived);
    this.room.on(JEVENTS.conference.TRACK_REMOVED, this.onTrackRemoved);
    this.room.on(JEVENTS.conference.CONFERENCE_JOINED, this.onLocalUserJoined);
    this.room.on(JEVENTS.conference.USER_JOINED, this.onRemoteUserJoined);
    this.room.on(JEVENTS.conference.USER_LEFT, this.onUserLeft);
    this.room.on(
      JEVENTS.conference.ENDPOINT_STATS_RECEIVED,
      this.onStatsReceived
    );
    this.stateMessage(LOCALE.JOINING_CONFERENCE);
    this.room.join();
  }

  /**
   * 
   */
  setLocalUserInfo() {
    let { username } = this.mget(_a.user) || {};
    if (!Visitor.isGuest()) {
      username = Visitor.fullname();
    }
    this.mset({ username })
    this.room.setDisplayName(username);
  }

  /**
   * This function is called when we disconnect.
   */
  disconnect() {
    this.connection.removeEventListener(
      JEVENTS.connection.CONNECTION_ESTABLISHED,
      this.onConnectionSuccess
    );
    this.connection.removeEventListener(
      JEVENTS.connection.CONNECTION_FAILED,
      this.onConnectionFailed
    );
    this.connection.removeEventListener(
      JEVENTS.connection.CONNECTION_DISCONNECTED,
      this.disconnect
    );
    this.connection.removeEventListener(
      JEVENTS.connection.WRONG_STATE,
      this.onWrongState
    );
    JitsiMeetJS.mediaDevices.removeEventListener(
      JEVENTS.mediaDevices.DEVICE_LIST_CHANGED,
      this.onDeviceListChanged
    );
    JitsiMeetJS.mediaDevices.removeEventListener(
      JEVENTS.mediaDevices.USER_MEDIA_SLOW_PROMISE_TIMEOUT,
      this.onPermissionPrompted
    );
    this.room.off(JEVENTS.conference.TRACK_ADDED, this.onStreamReceived);
    this.room.off(JEVENTS.conference.TRACK_REMOVED, this.onTrackRemoved);
    this.room.off(JEVENTS.conference.CONFERENCE_JOINED, this.onLocalUserJoined);
    this.room.off(JEVENTS.conference.USER_JOINED, this.onRemoteUserJoined);
    this.room.off(JEVENTS.conference.USER_LEFT, this.onUserLeft);
    this.room.off(
      JEVENTS.conference.ENDPOINT_STATS_RECEIVED,
      this.onStatsReceived
    );
  }

  /**
   *
   * @param {*} tracks
   */
  createLocalTracks(devices, micDeviceId = "default") {
    if (!_.isArray(devices)) devices = [devices];
    const opt = require("./configs/tracks")({ devices, micDeviceId });
    if (this.isDestroyed()) {
      this.warn("Attemptiing to create tracks with destroyed view");
      this.debug("AAA:227", this, JitsiMeetJS);
      console.trace();
      return
    }
    return new Promise((resolve, reject) => {
      JitsiMeetJS.createLocalTracks(opt)
        .then(async (tracks) => {
          for (let track of tracks) {
            let type = track.getType();
            let videoType = track.getVideoType();
            track.addEventListener(
              JEVENTS.track.TRACK_MUTE_CHANGED,
              this.onTrackMuteChange
            );
            if (this.localTracks[type])
              this.idleStreams.push(this.localTracks[type].stream);
            this.localTracks[type] = track;
            switch (type) {
              case _a.video:
                track.addEventListener(
                  JEVENTS.track.LOCAL_TRACK_STOPPED,
                  this.stopPresentation
                );
                if (videoType == _a.desktop) {
                  this.toggleAvatarVideo(1, 0);
                  this.ensurePart(_a.video).then((el) => {
                    el.setState(0);
                  });
                } else {
                  this.getLocalParts().then((parts) => {
                    let { video } = parts;
                    track.attach(video.el);
                  });
                  this.toggleAvatarVideo(0, 1);
                  this.ensurePart(_a.video).then((el) => {
                    el.setState(1);
                  });
                }
                break;
              case _a.audio:
                this.trigger("local-audio-ready");
                track.on(
                  JEVENTS.track.LOCAL_TRACK_STOPPED,
                  this.onLocaAudioStopped
                );
                break;
            }
            if (!this.room || !this.room.isJoined()) continue;
            let oldTrack = null;
            switch (type) {
              case _a.audio:
                oldTrack = this.getLocalTrack(type);
                if (oldTrack) {
                  this.room.replaceTrack(oldTrack, track);
                } else {
                  this.room.addTrack(track);
                }
                break;
              case _a.video:
                oldTrack = this.getLocalTrack(videoType);
                if (oldTrack) {
                  if (oldTrack.getVideoType() == videoType) {
                    this.room.replaceTrack(oldTrack, track);
                  } else {
                    await this.room.removeTrack(oldTrack);
                    this.room.addTrack(track);
                  }
                } else {
                  this.room.addTrack(track);
                }
            }
          }
          this._tracksInitialized = true;
          this.trigger("device:permission:granted");
          resolve(tracks);
        })
        .catch((error) => {
          if (error.name && /user_canceled/i.test(error.name)) {
            this.__ctrlScreen.setState(0);
            this.__ctrlVideo.el.dataset.muted = 0;
            reject(error);
          }
          this.warn("Failed to get device permision:", error);
          let details = error.message || `${error}`;
          let msg = `${LOCALE.DEVICES_PERMISSION_DENIED} (${details})`;
          Wm.alert(msg);
          reject(error);
        });
    });
  }

  /**
   *
   * @returns
   */
  async prepareConference(room) {
    this.stateMachine("waiting");
    await Kind.waitFor("webrtc_participants");
    await Kind.waitFor("webrtc_local_user");
    await Kind.waitFor("webrtc_remote_user");
    await Kind.waitFor("webrtc_attendee");
    await Kind.waitFor("sound_analyzer");
    await uiRouter.ensureWebsocket();

    JitsiMeetJS.mediaDevices.addEventListener(
      JEVENTS.mediaDevices.DEVICE_LIST_CHANGED,
      this.onDeviceListChanged
    );

    JitsiMeetJS.mediaDevices.addEventListener(
      JEVENTS.mediaDevices.USER_MEDIA_SLOW_PROMISE_TIMEOUT,
      this.onPermissionPrompted
    );

    this.waitElement(this.el, () => {
      this.el.dataset.mode = this.mget(_a.mode) || _a.none;
      this.el.dataset.status = this.mget(_a.status) || _a.none;
      this.$el.resizable({
        resize: this._resize,
        aspectRatio: false,
        scroll: false,
        handles: "all",
      });
    });
    await this.getLocalParts();
    this.stateMachine("getUserDevices");
    let track = await this.createLocalTracks(_a.audio);
    if (track) {
      this.bindConferenceRoom(room)
        .then(() => {
          this.postOnlineState();
        })
        .catch((e) => {
          this.stateMessage(LOCALE.INTERNAL_ERROR);
          this.warn("ERROR:[133]:", e);
        });
    } else {
      this.stateMessage(LOCALE.DEVICES_PERMISSION_DENIED);
    }
  }

  /**
   *
   */
  onLocaAudioStopped(track) {
    track.off(JEVENTS.track.LOCAL_TRACK_STOPPED, this.onLocaAudioStopped);
  }

  /**
   *
   */
  onTrackMuteChange(track) {
    let type = track.getType();
    switch (type) {
      case _a.video:
        if (track.getVideoType() == _a.desktop) {
          this.isScreenShare = !track.isMuted();
          this.__ctrlScreen.setState(this.isScreenShare);
          if (track.isMuted()) {
            this.presenterId = null;
          }
        } else {
          this.isVideo = !track.isMuted();
          this.__ctrlVideo.setState(this.isVideo);
          if (this.isVideo) {
            this.toggleAvatarVideo(0, 1);
          } else {
            this.toggleAvatarVideo(1, 0);
          }
        }
        break;
      case _a.audio:
        this.isAudio = !track.isMuted();
        this.__ctrlAudio.setState(this.isAudio);
        break;
    }
    track.removeEventListener(
      JEVENTS.track.TRACK_MUTE_CHANGED,
      this.onTrackMuteChange
    );
  }

  /**
   * @param track JitsiTrack object
   */
  onTrackRemoved(track) {
    this.trigger("TRACK_REMOVED", track);
  }

  /**
   * 
   */
  attachLocalEndpoint(track) {
    this.getLocalParts().then((parts) => {
      let { sound, audio } = parts;
      sound.plug(track.stream);
    });

    this.ensurePart("ctrl-audio").then((p) => {
      if (track.isMuted()) {
        p.setState(1);
        p.el.dataset.muted = "0";
      } else {
        p.setState(1);
        p.el.dataset.muted = "0";
      }
    });
  }


  /**
   * Handles remote tracks
   * @param track JitsiTrack object
   */
  onStreamReceived(track) {
    const participant_id = track.getParticipantId();
    if (!participant_id) {
      this.warn("Got track wihthout participant_id", track);
      return;
    }

    if (this._kicked[participant_id]) {
      this.warn(`${participant_id} already kicked out`);
      return;
    }

    if (track.isLocal()) {
      this.attachLocalEndpoint(track);
      return;
    }

    if (track.getVideoType() == _a.desktop) {
      this.loadRemotePresentation(track, 1);
      return;
    }
    /** Wait a while to ensure HELLO message has arrived */
    setTimeout(() => {
      if (!this._guests.get(participant_id)) {
        this.warn(`Participant ${participant_id} is not expected. Should kick out`);
        if (this.mget(_a.role) == "host") {
          this.room.kickParticipant(participant_id, LOCALE.WEAK_PRIVILEGE);
          this._kicked[participant_id] = participant_id;
          this.room.off(JEVENTS.conference.TRACK_ADDED, this.onStreamReceived);
        }
      }
    }, 5000);
    let args = {
      participant_id,
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nid) || this.mget(_a.room_id),
      room_id: this.mget(_a.room_id),
      socket_id: Visitor.get(_a.socket_id),
      deviceId: Visitor.deviceId(),
    };

    this.postService(
      SERVICE.conference.attendee, args).then((attendee = {}) => {
        const { room_id, participant_id } = attendee;
        if (participant_id && room_id == this.mget(_a.room_id)) {
          this._guests.set(participant_id, attendee);
        }
      });
  }

  /**
   * That function is executed when the conference is joined by the local user
   */
  async onLocalUserJoined(...args) {
    this.mset({ participant_id: this.room.myUserId() });
    if (this.isJoined) return;
    this.isJoined = true;
    let timer = setInterval(async () => {
      let track = this.getLocalTrack(_a.audio);
      if (!track && this.localTracks.audio) {
        await this.room.addTrack(this.localTracks.audio);
        track = this.getLocalTrack(_a.audio);
        if (track) {
          if (track.isMuted(), track.isActive()) {
            clearInterval(timer)
            await this.broadcastJoining(args);
          } else {
            this.stateMessage(LOCALE.X_MIKE_BEING_UNMUTED.format(LOCALE.MY_COMPUTER));
          }
        }
      }
    }, 2000);

    if (this.__participants.collection.length <= 1) {
      this.stateMessage("waiting");
    }
  }

  /**
   *
   * @param {*} flag
   * @param {*} data
   * @returns
   */
  sendRoomSignaling(service, data = {}) {
    let opt = {
      service,
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nid) || this.mget(_a.room_id),
      room_id: this.mget(_a.room_id),
      socket_id: Visitor.get(_a.socket_id),
      deviceId: Visitor.deviceId(),
      metadata: this.metadata(),
      ...data,
    }
    if (this.room) {
      opt.participant_id = this.room.myUserId();
    }
    return this.postService(opt);
  }

  /**
   *
   */
  metadata() {
    let micState = 0;
    if (this.__ctrlAudio) {
      micState = this.__ctrlAudio.getState();
    }

    let camState = 0;
    if (this.__ctrlVideo) {
      camState = this.__ctrlVideo.getState();
    }
    let screenState = 0;
    if (this.__ctrlScreen) {
      screenState = this.__ctrlScreen.getState();
    }

    let metadata = {
      muted: this.isLocalAudioMuted(),
      audio: micState,
      video: camState,
      screen: screenState,
      type: this.service_class,
    };
    if (this.room) {
      metadata.participant_id = this.room.myUserId();
    }
    return metadata;
  }

  /**
   *
   */
  async broadcastJoining() {
    let muted = this.isLocalAudioMuted();
    let mic = 0;
    if (this.__ctrlAudio) {
      mic = this.__ctrlAudio.getState();
    }
    let { firstname, lastname, username, uid } = this.mget(_a.user) || {};
    let userAttributes = {
      username,
      uid: uid || Visitor.id,
      firstname: firstname || Visitor.firstname(),
      lastname: lastname || Visitor.lastname(),
      quota: this.get(_a.quota),
      id: this.room.myUserId(),
      socket_id: Visitor.get(_a.socket_id),
      muted,
      mic,
      participant_id: this.room.myUserId()
    };
    await this.room.setLocalParticipantProperty(
      _a.userAttributes,
      JSON.stringify(userAttributes)
    );
    if (this.__participants.isEmpty()) {
      if (!this._joining) this.stateMessage("waiting");
    } else {
      if (this.__participants.collection.length < 2) {
        this.stateMessage("waiting");
      }
    }
    let event = "HELLO";
    let payload = {
      id: this.room.myUserId(),
      room_id: this.mget(_a.room_id),
    };
    await this.sendRoomSignaling(SERVICE.conference.update);
    await this.sendRoomSignaling(SERVICE.conference.broadcast, { event, payload });

  }

  /**
   *
   */
  prepareRemoteScreen(args) {
    this.videoSize = {
      width: window.innerWidth - 100,
      height: window.innerHeight,
    };
    this.displayPresentation(null);
    this.stateMessage();
    this.__ctrlScreen.el.dataset.muted = 1;
    this.responsive("presenter");
    if (args.username) {
      this.__presenter.feed([
        Skeletons.Note({
          className: `${this.fig.family}__waiting-screen`,
          content: LOCALE.X_SCREEN_PREPARING.format(args.username),
        }),
        { kind: "spinner" },
      ]);
    }
    this.isScreenShare = true;
  }

  /**
   *
   */
  isLocalAudioMuted() {
    let t;
    if (!this.room || !this.room.isJoined()) {
      t = this.localTracks.audio;
      if (!t || !t.isActive() || t.isMuted() || t.isEnded()) {
        return 1;
      }
      return 0;
    }

    t = this.room.getLocalAudioTrack();
    if (!t || !t.isActive() || t.isMuted() || t.isEnded()) {
      return 1;
    }
    return 0;
  }

  /**
   *
   */
  onPermissionPrompted() {
    setTimeout(() => {
      if (!this._tracksInitialized) {
        Wm.alert(LOCALE.NEED_DEVICES_PERMISSION);
      }
    }, 3000);
    this.once("device:permission:granted", () => {
      Wm.alert();
    });
  }

  /**
   *
   */
  onWrongState() {
    this.debug("AAA:401 -- TO DO handle onWrongState");
  }

  /**
   * That function is executed when the conference is joined by the remote user
   * this event is triggrered by Drumee
   */
  async onRemoteDrumateJoined(data) {
    this._joining = 1;
    this.stateMessage(LOCALE.X_IS_CONNECTING.format(data.username));
  }

  /**
   * That function is executed when the conference is joined by the remote user
   * this event is triggrered by Jitsi
   */
  async onRemoteUserJoined(id, participant) {
    let endpoint = this.endpoints[id];
    if (endpoint && !endpoint.isDestroyed()) {
      this.warn("User already joined", id);
      return;
    }

    if (this.__participants.isEmpty()) {
      if (!this._joining) this.stateMessage("waiting");
    }
    this.stateMessage(
      LOCALE.X_HAS_JOINED_MEETING.format(participant.getDisplayName(), "")
    );
    this.__participants.append(
      require("builtins/webrtc/skeleton/remote-user")(this, {
        participant,
        participant_id: id,
        peer: this.peer,
        quota: this.mget(_a.quota)
      })
    );
    endpoint = this.__participants.children.last();
    endpoint.once("audio:ready", () => { this.stateMessage() });
    this.endpoints[id] = endpoint;
    this.responsive();
    if (this.__peerContainer && !this.__peerContainer.isEmpty()) {
      this.__peerContainer.clear();
    }
  }

  /**
   *
   */
  onFullScreenChange() {
    if ((screen.availHeight || screen.height - 20) <= window.innerHeight) {
      // setTimeout(() => { this.fitScreenSize("presenter") }, 1000);
    }
    {
      if (!this.savedGeometry) {
        this.savedGeometry = {
          ...this.$el.position(),
          width: this.$el.width(),
          height: this.$el.height(),
        };
      }
      // setTimeout(() => { this.fitScreenSize("presenter-full") }, 1000);
    }
  }

  /**
   *
   */
  fitScreenSize(mode) {
    let s = { ...this.videoSize };
    this.el.dataset.mode = mode;
    let w = window.innerWidth;
    let h = window.innerHeight;
    let width = w - 200;
    let height = h - 42;
    if (mode == "presenter-full") {
      width = w;
    }
    let bbox = fitBoxes(
      { width, height },
      { width: s.width, height: s.height }
    );
    width = bbox.width + 200;
    height = bbox.height + 42;
    if (mode == "presenter-full") {
      width = bbox.width;
    }
    let left = (w - width) / 2;
    let top = (h - height) / 2;
    if (left + width > w) left = (w - width) / 2;
    if (top + height > h) top = (h - height) / 2;
    this.change_size(this, { top, left, width, height });
  }

  /**
   *
   */
  async loadRemotePresentation(track) {
    let k = this.__presenter.getItemsByKind("webrtc_remote_display");
    if (k.length) {
      this.presentation = k[0];
      if (this.presentation.__video) {
        track.attach(this.presentation.__video.el);
      }
      return;
    }
    this.presentationStarted = true;
    let opt = {
      kind: "webrtc_remote_display",
      participant_id: track.getParticipantId(),
      track,
      room: this.room,
      uiHandler: [this],
    };
    await Kind.waitFor(opt.kind);
    let presenter = this.__participants.getItemsByAttr(
      "participant_id",
      opt.participant_id
    )[0];
    if (presenter) {
      opt.username = presenter.mget(_a.username);
    }
    this.__presenter.feed(opt);
    let child = this.__presenter.children.last();
    child.once(_e.destroy, () => {
      this.presenterId = null;
    });
  }

  /**
   * In case where the event were lost, catch up from stat
   */
  onStatsReceived(p) {
    if (this.presentation && !this.presentation.isDestroyed()) return;
    for (let t of p.getTracks()) {
      if (t.getVideoType() != _a.desktop) continue;
      if (!this.presenterId) continue;
      if (t.getParticipantId() != this.presenterId) continue;
      if (t.isMuted()) {
        this.presenterId = null;
        this.onRemoteScreenStop();
      } else {
        this.loadRemotePresentation(t);
      }
    }
  }

  /**
   *
   * @param id
   */
  onUserLeft(id) {
    let endpoint = this.endpoints[id];
    this.trigger("user-left", { id });
    if (!endpoint) {
      return;
    }
    endpoint.goodbye();
    this._guests.delete(id)
  }

  /**
   * This function is called when the connection fail.
   */
  onConnectionFailed(e) {
    this.warn("Connection Failed!", e);
    this.stateMessage(LOCALE.CONFERENCE_CONNECTION_FAILED + ` (${e})`);
  }

  /**
   * This function is called when the connection fail.
   */
  onDeviceListChanged(devices) {
    this.recreateLocalTrackOnDeviceChange();
  }

  /**
   *
   */
  async unload() {
    for (let type in this.localTracks) {
      let t = this.localTracks[type];
      if (!t.disposed) {
        await t.dispose();
      }
    }

    for (let stream of this.idleStreams) {
      if (!stream) continue;
      for (let t of stream.getTracks()) {
        await t.stop();
      }
    }

    setTimeout(async () => {
      if (this.room) {
        await this.room.leave();
        await this.connection.disconnect();
        this.room = null;
        this.connection = null;
      }
    }, 2000);
    if (this.retryTimer) clearInterval(this.retryTimer);
  }

  /**
   *
   */
  async leaveRoom(opt = {}) {
    if (this.isDestroyed() || this.isLeaving) return;
    this.isLeaving = true;
    window.removeEventListener("unload", this.leaveRoom);
    try {
      await this.unload();
    } catch (e) {
      this.warn("FAILED TO UNLOAD", e);
    }
    try {
      if (this.beforeLeavingState) {
        await this.stateMachine(this.beforeLeavingState);
        switch (this.beforeLeavingState) {
          case "leave":
          case "terminated":
            await this.sendRoomSignaling(SERVICE.conference.leave);
            break;
        }
      } else {
        await this.sendRoomSignaling(SERVICE.conference.leave);
      }
    } catch (e) {
      this.warn("FAILED TO UPDATE LEAVING", e);
    }
    setTimeout(async () => {
      this.postOnlineState();
    }, 2000);
    this.goodbye();
  }

  /**
   *
   * @param selected
   */
  changeAudioOutput(selected) {
    JitsiMeetJS.mediaDevices.setAudioOutputDevice(selected.value);
  }


  /**
   *
   */
  async changeLocalVideo(state) {
    await this.sendRoomSignaling(SERVICE.conference.update);
    if (state) {
      if (this.isSharingScreen()) {
        this.stateMessage(LOCALE.SCREEN_BEING_SHARED, Visitor.timeout());
        this.__ctrlVideo.setState(0);
        return;
      }
      this.isVideo = true;
      this.toggleAvatarVideo(0, 1);
      await this.createLocalTracks(_a.video);
    } else {
      this.isVideo = false;
      this.toggleAvatarVideo(1, 0);
      await this.stopLocalTrack(CAMERA);
    }
  }

  /**
   *
   */
  async changeLocalAudio(state) {
    let t = this.getLocalTrack(_a.audio);
    await this.sendRoomSignaling(SERVICE.conference.update);
    if (state) {
      if (!t) {
        await this.createLocalTracks(_a.audio);
      } else if (t.isActive()) {
        await t.unmute();
      } else {
        await t.dispose();
        await this.createLocalTracks(_a.audio);
      }
    } else {
      t && (await t.mute());
    }
  }

  /**
   *
   */
  async changePresentation(state) {
    if (state) {
      await this.startPresentation();
    } else {
      await this.stopPresentation();
    }
  }

  /**
   *
   * @returns
   */
  async startPresentation() {
    let pending = this.isSharingScreen();
    if (pending || this.isScreenShare) {
      //this.__ctrlScreen.setState(0);
      Wm.alert(LOCALE.SCREEN_BEING_SHARED, Visitor.timeout());
      return false;
    }
    if (!this.__presenter.isEmpty()) {
      this.stateMessage(LOCALE.SHARE_SCREEN_WARNING, Visitor.timeout());
      this.__ctrlScreen.setState(0);
      return;
    }
    this.videoPaused = this.isVideo;
    this.stateMessage(LOCALE.PREPARING_PRESENTATION);
    this.isVideo = false;
    await this.sendRoomSignaling(SERVICE.conference.update);
    let tracks = await this.createLocalTracks(_a.desktop);
    if (_.isEmpty(tracks)) {
      this.stateMessage("Failed to prepare screen share");
      return false;
    }
    this.toggleAvatarVideo(1, 0);
    this.stateMessage();
    this.__ctrlVideo.el.dataset.muted = 1;
    let payload = {
      username: Visitor.fullname(),
      uid: Visitor.id,
      firstname: Visitor.firstname(),
      lastname: Visitor.lastname(),
      id: this.room.myUserId(),
      room_id: this.mget(_a.room_id)
    };
    let event = "START_REMOTE_SCREEN";
    this.sendRoomSignaling(SERVICE.conference.broadcast, { event, payload });

    return true;
  }

  /**
   *
   */
  async stopPresentation(track) {
    this.__ctrlVideo.el.dataset.muted = 0;
    if (!track) {
      track = this.getLocalTrack(_a.desktop);
    }

    if (!track) {
      this.warn("No track to stop");
      return;
    }
    await this.stopLocalTrack(_a.desktop);
    let payload = {
      id: this.room.myUserId(),
      srcId: this.room.myUserId(),
    };
    let event = "STOP_REMOTE_SCREEN";
    await this.sendRoomSignaling(SERVICE.conference.update);
    await this.sendRoomSignaling(SERVICE.conference.broadcast, { event, payload });
    track.removeEventListener(
      JEVENTS.track.LOCAL_TRACK_STOPPED,
      this.stopPresentation
    );
  }

  /**
   *
   */
  isSharingScreen() {
    if (!this.room) return false;
    let tracks = this.room.getLocalTracks();
    for (let track of tracks) {
      if (!track.isMuted() && track.getVideoType() == _a.desktop) {
        this.isScreenShare = true;
        return true;
      }
    }
    this.isScreenShare = false;
    return false;
  }

  /**
   *
   */
  getLocalTrack(type) {
    let track;
    if (!this.room) {
      return this.localTracks[type];
    }

    switch (type) {
      case _a.audio:
        return this.room.getLocalAudioTrack();
      case CAMERA:
      case _a.desktop:
        for (track of this.room.getLocalVideoTracks()) {
          if (track.getVideoType() == type) return track;
        }
      case _a.video:
        return this.room.getLocalVideoTrack();
    }
    return null;
  }

  /**
   *
   */
  async stopLocalTrack(type) {
    let i = 0;
    let track;
    if (!this.room) return null;
    switch (type) {
      case _a.audio:
        track = this.room.getLocalAudioTrack();
        track && (await track.mute());
        return;
      case _a.video:
        track = this.room.getLocalVideoTrack();
        track && (await track.mute());
        return;
      case CAMERA:
      case _a.desktop:
        for (let t of this.room.getLocalVideoTracks()) {
          if (t.getVideoType() == type) {
            await t.mute();
          }
        }
        return;
    }
  }

  /**
   *
   * @param {*} service
   * @param {*} data
   * @param {*} options
   */
  onWsMessage(service, data, options = {}) {
    if (!this.room || !this.room.isJoined()) return;
    if (options.service != SERVICE.conference.broadcast) return;
    if (data.id == this.room.myUserId() || data.srcId == this.room.myUserId()) {
      return;
    }
    switch (options.event) {
      case "START_REMOTE_SCREEN":
        if (this.presenterId || data.room_id != this.mget(_a.room_id)) {
          return;
        }
        this.presenterId = data.id;
        this.prepareRemoteScreen(data);
        break;
      case "STOP_REMOTE_SCREEN":
        // Ensure the presentation is actually closed
        setTimeout(() => {
          if (!this.presenterId) {
            if (this.__presenter.isEmpty()) {
              return;
            }
          }
          this.onRemoteScreenStop();
        }, 5000);
        break;

      case "HELLO":
        if (data && data.id) {
          this._guests.set(data.id, data);
        }
        break;

      // case "TRACK_SYNC":
      //   if (this.room.myUserId() == data.destId) {
      //     this.trackSync(data);
      //   }
      //   break;
    }
  }
}

module.exports = __webrtc_room;
