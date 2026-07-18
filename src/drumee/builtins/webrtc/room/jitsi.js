let CAMERA = "camera";
const JitsiMeetJS = require('vendor/lib/jitsi/lib-jitsi-meet.min.js');
const { events: JEVENTS } = JitsiMeetJS;
const { fitBoxes } = require("@drumee/ui-essentials")

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
    this.onDominantSpeaker = this.onDominantSpeaker.bind(this);
  }

  /**
   * Jitsi DOMINANT_SPEAKER_CHANGED handler. Flips data-speaking on the tile
   * of whoever is currently talking (and clears it on everyone else) so the
   * skin can draw an active-speaker ring — like Google Meet. Remote tiles
   * live in this.endpoints keyed by participant id; the local tile is the
   * participants manager's "local-user" part.
   */
  onDominantSpeaker(id) {
    const myId = this.room && this.room.myUserId && this.room.myUserId();
    if (this.endpoints) {
      for (const pid of Object.keys(this.endpoints)) {
        const ep = this.endpoints[pid];
        if (ep && !ep.isDestroyed() && ep.el)
          ep.el.dataset.speaking = pid === id ? 1 : 0;
      }
    }
    if (typeof this.getLocalParts === "function") {
      this.getLocalParts()
        .then((parts) => {
          const local = parts && parts.local;
          if (local && !local.isDestroyed() && local.el)
            local.el.dataset.speaking = id === myId ? 1 : 0;
        })
        .catch(() => {});
    }
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

    // Keep the bound ref so onBeforeDestroy can actually remove it — a fresh
    // .bind() there would be a different function and removeEventListener would
    // silently no-op, leaking one listener per meeting open/close.
    this._onFullScreenChange = this.onFullScreenChange.bind(this);
    document.addEventListener("fullscreenchange", this._onFullScreenChange);

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
    // Start fetching the conference widget chunks the moment ANY room window
    // exists (dialing, ringing, opening a meeting) so they're already loaded
    // by the time prepareConference needs them — instead of five serialized
    // chunk fetches sitting between pickup and first audio.
    this.warmConferenceKinds();
  }

  /**
   * Fire the dynamic imports for every widget kind the conference needs, in
   * parallel, memoized. prepareConference awaits this instead of calling
   * Kind.waitFor one by one (which serialized five network round trips).
   */
  warmConferenceKinds() {
    if (!this._warmKinds) {
      this._warmKinds = Promise.all([
        "webrtc_participants",
        "webrtc_local_user",
        "webrtc_remote_user",
        "webrtc_attendee",
        "sound_analyzer",
      ].map((name) => Kind.waitFor(name)));
      this._warmKinds.catch((e) => this.warn("kind warmup failed", e));
    }
    return this._warmKinds;
  }

  /**
   *
   */
  bindConferenceRoom(room = {}) {
    let { configs } = room;
    if (!configs || !configs.domain) {
      throw ("Conference server has not been properly set up");
    }
    const options = {
      init: require("./configs/init")(),
      connection: require("./configs/connection")(configs),
    }
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

      this._onConnectionEstablished = (args) => {
        this.onConnectionSuccess();
        resolve();
      };
      this.connection.addEventListener(
        JEVENTS.connection.CONNECTION_ESTABLISHED,
        this._onConnectionEstablished
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
  async onConnectionSuccess() {
    if (this.isLeaving || this.isDestroyed()) return;
    // Local media is acquired IN PARALLEL with this XMPP connection
    // (prepareConference). Wait for it here so the local tracks are still
    // added BEFORE join() and ride the initial Jingle offer — the exact
    // ordering contract the old serialized flow guaranteed.
    if (this._startupTracks) {
      try { await this._startupTracks; } catch (e) { }
      if (this.isLeaving || this.isDestroyed()) return;
      // Media never came up (mic denied/missing): don't join a conference we
      // can't publish to — prepareConference surfaces the permission error.
      if (this._startupMediaFailed) return;
    }
    let room_id = this.mget(_a.room_id);
    try {
      console.log("[ROOMDBG] onConnectionSuccess -> initJitsiConference", {
        room_id, nid: this.mget(_a.nid), service_class: this.service_class,
        role: this.caller ? "CALLEE" : (this.callee ? "CALLER" : "?"),
      });
    } catch (e) { }
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
    this.room.on(
      JEVENTS.conference.DOMINANT_SPEAKER_CHANGED,
      this.onDominantSpeaker
    );

    // Add tracks before join so they ride the initial Jingle offer.
    if (this.localTracks.audio) {
      try { await this.room.addTrack(this.localTracks.audio); }
      catch (e) { this.warn("addTrack(audio) failed", e); }
    }
    if (this.localTracks.video) {
      try { await this.room.addTrack(this.localTracks.video); }
      catch (e) { this.warn("addTrack(video) failed", e); }
    }

    this.stateMessage(
      this.service_class === "connect"
        ? LOCALE.CONNECTING
        : LOCALE.JOINING_CONFERENCE,
    );
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
    if (this.connection) {
      this.connection.removeEventListener(
        JEVENTS.connection.CONNECTION_ESTABLISHED,
        this._onConnectionEstablished || this.onConnectionSuccess
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
    }
    JitsiMeetJS.mediaDevices.removeEventListener(
      JEVENTS.mediaDevices.DEVICE_LIST_CHANGED,
      this.onDeviceListChanged
    );
    JitsiMeetJS.mediaDevices.removeEventListener(
      JEVENTS.mediaDevices.USER_MEDIA_SLOW_PROMISE_TIMEOUT,
      this.onPermissionPrompted
    );
    if (this.room) {
      this.room.off(JEVENTS.conference.TRACK_ADDED, this.onStreamReceived);
      this.room.off(JEVENTS.conference.TRACK_REMOVED, this.onTrackRemoved);
      this.room.off(JEVENTS.conference.CONFERENCE_JOINED, this.onLocalUserJoined);
      this.room.off(JEVENTS.conference.USER_JOINED, this.onRemoteUserJoined);
      this.room.off(JEVENTS.conference.USER_LEFT, this.onUserLeft);
      this.room.off(
        JEVENTS.conference.ENDPOINT_STATS_RECEIVED,
        this.onStatsReceived
      );
      this.room.off(
        JEVENTS.conference.DOMINANT_SPEAKER_CHANGED,
        this.onDominantSpeaker
      );
    }
  }

  /**
   *
   * @param {*} tracks
   */
  createLocalTracks(devices, micDeviceId = "default", createOpt = {}) {
    // Serialize concurrent callers (confirm-device-select, DEVICE_LIST_CHANGED,
    // mute/unmute, init) so overlapping createLocalTracks + replaceTrack don't
    // race the single Jingle renegotiation and leave a dead audio sender — the
    // intermittent "no audio after changing sound device" bug.
    // opt.silent suppresses the user-facing permission alert on failure — used
    // for the OPTIONAL startup camera, whose failure falls back to audio-only
    // (the caller handles the UI) and must not pop a misleading popup.
    this._trackOp = Promise.resolve(this._trackOp)
      .catch(() => {})
      .then(() => this._doCreateLocalTracks(devices, micDeviceId, createOpt));
    return this._trackOp;
  }

  _doCreateLocalTracks(devices, micDeviceId = "default", createOpt = {}) {
    if (!_.isArray(devices)) devices = [devices];
    const trackOpt = { devices, micDeviceId };
    // Camera device is threaded via createOpt (the 2nd positional arg is the
    // mic id). configs/tracks spreads it straight through to lib-jitsi-meet's
    // createLocalTracks, which honours a top-level cameraDeviceId.
    if (createOpt.cameraDeviceId) trackOpt.cameraDeviceId = createOpt.cameraDeviceId;
    const opt = require("./configs/tracks")(trackOpt);
    if (this.isDestroyed()) {
      this.warn("Attemptiing to create tracks with destroyed view");
      console.trace();
      return
    }
    return new Promise((resolve, reject) => {
      JitsiMeetJS.createLocalTracks(opt)
        .then(async (tracks) => {
          for (let track of tracks) {
            let type = track.getType();
            let videoType = track.getVideoType();
            // getDisplayMedia returns a system/tab AUDIO track when the user
            // ticks "share audio" in the screen-share picker. It arrives here as
            // a plain audio track (getType()==='audio', videoType===null). If it
            // reached the audio handling below it would park the live mic stream
            // in idleStreams (only stopped at call teardown), overwrite
            // localTracks.audio, and replaceTrack(mic, desktopAudio) — cutting
            // the user's microphone for the rest of the call (never restored,
            // since stopPresentation only touches the desktop VIDEO track). The
            // mic is only ever created via a NON-desktop request, so any audio
            // track from a desktop request is this stray capture audio: drop it
            // and leave the microphone sender untouched.
            if (type === _a.audio && devices.includes(_a.desktop)) {
              try { if (track.dispose) await track.dispose(); }
              catch (e) { this.warn("drop desktop audio track failed", e); }
              continue;
            }
            track.addEventListener(
              JEVENTS.track.TRACK_MUTE_CHANGED,
              this.onTrackMuteChange
            );
            // The mute listener now persists for the track's lifetime (it no
            // longer self-removes after one fire — see onTrackMuteChange), so the
            // mic/camera button stays synced across repeated mute/unmute. Detach
            // it from the track being DISPLACED here: replaceTrack does not
            // dispose the old track, so without this a lingering camera/mic track
            // would keep its listener and could ghost-fire onTrackMuteChange.
            const displaced = this.localTracks[type];
            if (displaced) {
              if (displaced.removeEventListener) {
                displaced.removeEventListener(
                  JEVENTS.track.TRACK_MUTE_CHANGED,
                  this.onTrackMuteChange
                );
              }
              this.idleStreams.push(displaced.stream);
            }
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
                  // Await so the SDP renegotiation completes before the next
                  // op (the serialize lock above prevents cross-call overlap).
                  await this.room.replaceTrack(oldTrack, track);
                  // Release the previous mic device handle now (not only at
                  // teardown) so re-selecting the SAME device doesn't contend
                  // for it and return a muted/failed getUserMedia.
                  try {
                    if (oldTrack.dispose) await oldTrack.dispose();
                  } catch (e) {
                    this.warn("dispose displaced audio track failed", e);
                  }
                } else {
                  this.room.addTrack(track);
                }
                break;
              case _a.video:
                oldTrack = this.getLocalTrack(videoType);
                if (oldTrack) {
                  if (oldTrack.getVideoType() == videoType) {
                    await this.room.replaceTrack(oldTrack, track);
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
            // Canceling the screen-share picker is not an error — reset the
            // share control and bail WITHOUT the permission-denied popup.
            // (Missing return here made the cancel fall through to Wm.alert.)
            this.__ctrlScreen.setState(0);
            this._setService("ctrl-video", _a.settings);
            reject(error);
            return;
          }
          this.warn("Failed to get device permision:", error);
          // Suppress the blocking permission popup for the optional startup
          // camera (opt.silent): the call falls back to audio-only and the
          // caller updates the UI itself, so an alert here would wrongly imply
          // the whole call failed even though audio is fine.
          if (!createOpt.silent) {
            let details = error.message || `${error}`;
            let msg = `${LOCALE.DEVICES_PERMISSION_DENIED} (${details})`;
            Wm.alert(msg);
          }
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
    // All prerequisites in parallel. The kinds were awaited one by one here
    // (5 serialized chunk fetches); warmConferenceKinds started them at
    // initialize time, so this await is usually already settled.
    await Promise.all([
      this.warmConferenceKinds(),
      uiRouter.ensureWebsocket(),
    ]);

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
    // Acquire local media and open the XMPP signaling connection IN PARALLEL
    // (they were strictly serialized: getUserMedia audio → getUserMedia video
    // → connect — each step hundreds of ms to seconds). The tracks-before-join
    // ordering contract is preserved: onConnectionSuccess awaits
    // _startupTracks before initJitsiConference/join, so local tracks still
    // ride the initial Jingle offer and a media failure still aborts the join
    // (via _startupMediaFailed).
    this._startupTracks = this._createStartupTracks();
    this.bindConferenceRoom(room)
      .then(() => {
        this.postOnlineState();
      })
      .catch((e) => {
        this.stateMessage(LOCALE.INTERNAL_ERROR);
        this.warn("ERROR:[133]:", e);
      });
    // Rejection (mic denied) propagates to the caller exactly like the old
    // serialized `await createLocalTracks(audio)` did.
    let track = await this._startupTracks;
    if (!track) {
      this.stateMessage(LOCALE.DEVICES_PERMISSION_DENIED);
    }
  }

  /**
   * Startup local-media acquisition.
   * Video call: request mic+camera in a SINGLE getUserMedia instead of two
   * serialized acquisitions (the camera alone often takes ~1s to spin up).
   * If the combined request fails (camera denied/busy/missing), fall back to
   * the audio-only request so a camera problem still can't kill an
   * otherwise-fine audio call — the same resilience the old two-step flow
   * had, but the failure path is now the only path that pays for two
   * round trips. The tracks land in localTracks.* before join (see
   * onConnectionSuccess) so self-view + the peer get them immediately.
   */
  async _createStartupTracks() {
    let tracks = null;
    if (this.isVideo) {
      try {
        tracks = await this.createLocalTracks(
          [_a.audio, _a.video],
          "default",
          { silent: 1 }
        );
      } catch (e) {
        this.warn("startup camera+mic failed; retrying audio-only", e);
        this.isVideo = false;
        if (this.__ctrlVideo) this.__ctrlVideo.setState(0);
        this.toggleAvatarVideo(1, 0);
      }
    }
    if (!tracks || !tracks.length) {
      try {
        tracks = await this.createLocalTracks(_a.audio);
      } catch (e) {
        this._startupMediaFailed = 1;
        throw e;
      }
    }
    if (!tracks || !tracks.length) this._startupMediaFailed = 1;
    return tracks;
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
    // NOTE: do NOT remove the listener here. Audio mute/unmute reuses the SAME
    // track, so self-removing after the first fire left the mic button unsynced
    // from the 2nd toggle on. The listener is detached when the track is
    // displaced (createLocalTracks) or disposed at teardown (unload).
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
    // Only the local AUDIO track drives the sound analyzer.
    if (track && typeof track.getType === "function" &&
        track.getType() !== _a.audio) {
      return;
    }
    this.getLocalParts().then((parts) => {
      let { sound } = parts;
      sound.plug(track.stream);
    });

    // NOTE: deliberately does NOT set the mic control state here. This runs on
    // EVERY local TRACK_ADDED — including the renegotiation Jitsi performs when
    // a second participant joins — and re-deriving mic state from the transient
    // event track flipped an already-muted mic pill (window-meeting__ctrl-pill
    // mic) back to unmuted on join. The mic pill and the self-tile mic badge
    // are owned solely by the initial render + onTrackMuteChange (real
    // mute/unmute events), which a peer joining does not trigger — so leaving
    // the state untouched here keeps a muted mic muted when someone joins.
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

    // Let remote-user widgets attach without waiting for ENDPOINT_STATS_RECEIVED.
    this.trigger("TRACK_ADDED", track);

    /** Wait a while to ensure HELLO message has arrived */
    setTimeout(() => {
      if (this.isDestroyed() || !this.room) return;
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

    // Guard against the rare case where the pre-join addTrack didn't register.
    if (this.localTracks.audio && !this.room.getLocalAudioTrack()) {
      try {
        await this.room.addTrack(this.localTracks.audio);
      } catch (e) {
        this.warn("Failed to add local audio track", e);
      }
    }

    await this.broadcastJoining(args);

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
      this.service_class === "connect"
        ? LOCALE.X_HAS_JOINED_CALL.format(participant.getDisplayName())
        : LOCALE.X_HAS_JOINED_MEETING.format(participant.getDisplayName(), ""),
      3000
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
      // Drop the persistent mute listener (B2) before disposing. dispose() emits
      // LOCAL_TRACK_STOPPED, not TRACK_MUTE_CHANGED, so this is defensive rather
      // than strictly required — but it keeps teardown explicit and future-proof.
      if (t && t.removeEventListener) {
        t.removeEventListener(
          JEVENTS.track.TRACK_MUTE_CHANGED,
          this.onTrackMuteChange
        );
      }
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

    // Remove all Jitsi event listeners while references are still valid,
    // so the CONNECTION_DISCONNECTED callback below does not re-enter our handlers.
    this.disconnect();

    const room = this.room;
    const connection = this.connection;
    this.room = null;
    this.connection = null;
    setTimeout(async () => {
      // Disconnect even when the room never came up (e.g. media permission
      // denied after the XMPP connection was opened in parallel) — otherwise
      // the signaling websocket leaks until page unload.
      try {
        if (room) await room.leave();
        if (connection) await connection.disconnect();
      } catch (e) { }
    }, 0);
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
      try {
        // Recreate the camera with the user's last confirmed device, not the
        // implicit default — otherwise toggling the camera off/on after picking
        // a specific camera silently reverts capture to the default device
        // (mirrors changeLocalAudio's preferredInputDevice handling).
        const camId = this.preferredVideoInputDevice;
        await this.createLocalTracks(
          _a.video,
          "default",
          camId ? { cameraDeviceId: camId } : {}
        );
        // Re-attach the background effect to the freshly created camera track.
        if (this.bgEffect && this.bgEffect.type && this.bgEffect.type !== "none"
            && this.applyBackgroundEffect) {
          await this.applyBackgroundEffect();
        }
      } catch (e) {
        this.isVideo = false;
        this.toggleAvatarVideo(1, 0);
        if (this.__ctrlVideo) this.__ctrlVideo.setState(0);
      }
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
      // Recreate the mic with the user's last confirmed device, not the
      // implicit "default" — otherwise toggling mute/unmute after picking a
      // specific microphone silently reverts capture to the default device.
      const micId = this.preferredInputDevice || "default";
      if (!t) {
        await this.createLocalTracks(_a.audio, micId);
      } else if (t.isActive()) {
        await t.unmute();
      } else {
        await t.dispose();
        await this.createLocalTracks(_a.audio, micId);
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
    let tracks;
    try {
      tracks = await this.createLocalTracks(_a.desktop);
    } catch (e) {
      // Cancel or device failure — clear the "preparing" overlay that was shown
      // above (the clear below is unreachable once the await throws), then let
      // the caller handle it (meeting.startPresentation catches → returns false).
      this.stateMessage();
      throw e;
    }
    if (_.isEmpty(tracks)) {
      this.stateMessage("Failed to prepare screen share");
      return false;
    }
    this.toggleAvatarVideo(1, 0);
    this.stateMessage();
    this._setService("ctrl-video", null);
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
    this._setService("ctrl-video", _a.settings);
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
