const { toggleState } = require("@drumee/ui-essentials")
const PARTICIPANT_ID = "participant_id";
const __stream = require("builtins/webrtc/endpoint");
const { events: JEVENTS } = require('vendor/lib/jitsi/lib-jitsi-meet.min.js');

class __remote_user extends __stream {

  initialize(opt) {
    require("./skin");
    super.initialize(opt);

    this.participant = opt.participant;
    const displayName = this.participant.getDisplayName();
    try {
      const { firstname, lastname, uid, username } = opt
      this.mset({
        label: displayName || firstname || username || lastname,
        firstname: firstname || displayName,
        lastname,
        uid,
        username: displayName || username || firstname,
      });
    } catch (e) {

    }
    this.__ctrlStatus = opt.logicalParent.__ctrlStatus;
    //this._handshake = 0;
    this.loaderSkeleton = opt.logicalParent.loaderSkeleton;
    this.timer = null;
    this.tracks = [];
    this.logicalParent = opt.logicalParent;
    this.room = opt.logicalParent.room;
    this.localUserId = this.room.myUserId();

    this.handleTrackEvents = this.handleTrackEvents.bind(this);
    this.onPropertyChanged = this.onPropertyChanged.bind(this);
    this.onStatsReceived = this.onStatsReceived.bind(this);

    this.logicalParent.on("TRACK_ADDED", this.handleTrackEvents);

    this.room.on(
      JEVENTS.conference.TRACK_MUTE_CHANGED,
      this.handleTrackEvents
    );
    this.room.on(
      JEVENTS.conference.PARTICIPANT_PROPERTY_CHANGED,
      this.onPropertyChanged
    );
    this.room.on(
      JEVENTS.conference.ENDPOINT_STATS_RECEIVED,
      this.onStatsReceived
    );
  }

  /**
   *
   */
  async onBeforeDestroy() {
    this.logicalParent.off("TRACK_ADDED", this.handleTrackEvents);

    this.room.off(
      JEVENTS.conference.PARTICIPANT_PROPERTY_CHANGED,
      this.onPropertyChanged
    );
    this.room.off(
      JEVENTS.conference.ENDPOINT_STATS_RECEIVED,
      this.onStatsReceived
    );
    this.room.off(
      JEVENTS.conference.TRACK_MUTE_CHANGED,
      this.handleTrackEvents
    );

    this.room = null;
    this.logicalParent = null;
    if (this.timer !== null) {
      clearInterval(this.timer);
    }
    if (this.quota_timer) {
      clearInterval(this.quota_timer)
    }

    for (let track of this.tracks) {
      switch (track.getType()) {
        case _a.video:
          this.ensurePart(_a.video).then((v) => {
            track.detach(v.el);
          });
          break;
        case _a.audio:
          this.ensurePart("output").then((s) => {
            track.detach(s.el);
          });
          break;
      }
    }
  }


  /**
   *
   */
  onStatsReceived(p) {
    if (!this.room) return;
    if (this.isDestroyed()) {
      return;
    }
    if (p !== this.participant) return;
    let tracks = p.getTracks();
    if (_.isEmpty(tracks)) {
      this.warn("No track found for", p);
      return
    }
    for (let track of tracks) {
      if (!this.tracks.includes(track)) {
        this.handleTrackEvents(track);
      }
    }
    if (!this._started) {
      let now = new Date();
      this._started = now.getTime();
      let quota = this.mget(_a.quota);
      if (quota) {
        this.quota_timer = setInterval(() => {
          quota--;
          if (quota < 30*60) {
            this.triggerHandlers({ service: "watermark", quota });
            clearInterval(this.quota_timer)
          }
        }, 1000)
      }
    }
    this.tracks = tracks;
  }


  /**
  * 
  */
  updateCommandPanel(data) {
    if (data) {
      this.triggerService("remote-ready", data);
    }
    this.ensurePart('audio').then((s) => {
      s.setState(toggleState(this.isMuted()) ^ 1);
    })
  }

  /**
   *
   */
  async onDomRefresh() {
    // Render the real skeleton immediately so <audio sys_pn="output"> exists
    // before tracks arrive. The loader skeleton omitted it.
    this.feed(require('./skeleton')(this));
    await this.ensurePart('output');

    let timer = setInterval(() => {
      let tracks = this.participant.getTracks();
      if (tracks.length) {
        clearInterval(timer);
        this.onStatsReceived(this.participant);
      }
    }, 1000);
  }

  /**
   *
   */
  isMuted() {
    // Reflect ONLY the remote participant's mic. (Previously this also returned
    // muted when the LOCAL user's own mic button was off — so muting yourself
    // wrongly flipped every remote tile's audio indicator to "muted".)
    const p = this.participant;
    if (!p) return true;
    return p.isAudioMuted();
  }


  /**
   *
   * @param {*} service
   */
  triggerService(service, data) {
    let muted = this.isMuted();
    this.mset({ muted });
    this.triggerHandlers({
      service,
      muted,
      username: this.mget(_a.username) || this.mget(_a.firstname),
      participant_id: this.mget(PARTICIPANT_ID),
      ...data,
    });
  }

  /**
   * 
   */
  getRemoteUISettings() {
    return this.postService({
      service: SERVICE.conference.attendee,
      hub_id: this.mget(_a.hub_id),
      nid: this.mget(_a.nid) || this.mget(_a.room_id),
      room_id: this.mget(_a.room_id),
      socket_id: Visitor.get(_a.socket_id),
      deviceId: Visitor.deviceId(),
      participant_id: this.mget(PARTICIPANT_ID),
    }, { async: 1 })
  }

  /**
   *
   */
  async onPropertyChanged(p, k) {
    if (p !== this.participant) return;
    if (k != "userAttributes") return;
    let data = JSON.parse(p.getProperty(k));
    for (let name in data) {
      this.mset(name, data[name]);
    }
    this.feed(require("./skeleton")(this));
    await this.ensurePart("output");
    await this.ensurePart("sound");
    await this.ensurePart("video");
    await this.ensurePart("audio");
    // feed() above rebuilt <audio output> / <video> from scratch, which detaches
    // the live remote tracks (the Skeleton collection removes + recreates the
    // id-less child elements). Re-attach the current tracks via the normal
    // dispatcher so a participant-attributes update doesn't leave the tile
    // silent / black. handleTrackEvents routes audio->attach and video->attach
    // (with the camera/desktop/presenter logic) and is a no-op when no track.
    const aTrack = this.getRemoteTrack(_a.audio);
    if (aTrack) this.handleTrackEvents(aTrack);
    const vTrack = this.getRemoteTrack(_a.video);
    if (vTrack) this.handleTrackEvents(vTrack);
    this.updateCommandPanel(data);
  }

  /**
   * 
   */
  handleVideoMuteChange(track) {
    this.ensurePart(_a.video).then((v) => {
      if (track.isMuted()) {
        this.toggleAvatarVideo(1, 0);
        return;
      }
      v.el.oncanplay = (e) => {
        e.target.play();
      };
      if (track.getVideoType() == _a.desktop) {
        this.toggleAvatarVideo(1, 0);
      } else {
        setTimeout(() => {
          /** Wait a few seconds to ensure video type is stable */
          if (this.isDestroyed && this.isDestroyed()) return;
          if (track.getVideoType() == _a.desktop) {
            this.toggleAvatarVideo(1, 0);
            return;
          }
          if (track.isMuted()) {
            this.toggleAvatarVideo(1, 0);
            return;
          }
          // Re-resolve the <video> part: an onPropertyChanged re-feed during the
          // settle delay rebuilds the element, so the captured `v` may be stale
          // (attaching to it would leave the tile black). Attach to the live one.
          this.ensurePart(_a.video).then((cur) => {
            this.toggleAvatarVideo(0, 1);
            track.attach(cur.el);
            this.trigger("audio:ready");
          });
        }, 3000);
      }
    });
  }

  /**
   * 
   */
  handleAudioMuteChange(track) {
    if (!track) {
      return;
    }
    this.mset({
      muted: track.isMuted() ? 1 : 0,
    });
    this.ensurePart("audio").then((s) => {
      setTimeout(() => {
        s.setState(toggleState(!track.isMuted()));
      }, 300)
    });
    this.ensurePart("sound").then((s) => {
      if (!track.isMuted() && track.stream) {
        s.plug(track.stream);
      }
    });
    this.ensurePart("output").then((s) => {
      if (track.isMuted()) {
        track.detach(s.el);
      } else {
        track.attach(s.el);
        s.el.muted = false;
        s.el.volume = 1;
        s.el.oncanplay = (e) => {
          const p = e.target.play();
          if (p && p.catch) p.catch(() => { });
        };
        const p = s.el.play();
        if (p && p.catch) p.catch(() => { });
        this.updateCommandPanel();
        this._audioReady = true;
      }
    });

  }

  /**
   * Re-point this remote's audio element at the chosen output device. Needed
   * after the user changes the speaker, because Jitsi's global output change
   * only applies to elements attached AFTER it — this one is already attached.
   * An empty string is a valid setSinkId value (the system default).
   */
  reapplyAudioSink(deviceId) {
    this.ensurePart("output").then((s) => {
      if (s && s.el && typeof s.el.setSinkId === "function") {
        s.el.setSinkId(deviceId == null ? "" : deviceId).catch(() => { });
      }
    });
  }

  /**
   *
   */
  handleTrackEvents(track) {
    if (!track) return;
    if (this.mget(PARTICIPANT_ID) != track.getParticipantId()) {
      return;
    }
    switch (track.getType()) {
      case _a.video:
        if (this.logicalParent.presenterId) {
          this.toggleAvatarVideo(1, 0);
          return;
        }
        if (track.getVideoType() == _a.desktop) {
          // Explicit screenshare: keep avatar; handleVideoMuteChange attaches.
          this.toggleAvatarVideo(1, 0);
          this.handleVideoMuteChange(track);
        } else if (track.isMuted()) {
          // Camera (or not-yet-settled videoType) but muted -> avatar.
          this.toggleAvatarVideo(1, 0);
        } else {
          // Camera OR videoType not yet settled (null/undefined — common on a
          // mid-call UNMUTE, since camera-off only mutes the track, it doesn't
          // remove it). An unmuted remote video defaults to the camera attach
          // path. The previous `else` here was a dead no-op (WAITING_SCREEN),
          // which left the tile on the avatar forever whenever getVideoType()
          // wasn't exactly "camera" at event time — the root cause of "the
          // receiver's camera never shows on the caller". handleVideoMuteChange
          // re-checks for desktop after its settle delay, so an "unknown-first"
          // screenshare is still corrected to the avatar there.
          this.handleVideoMuteChange(track);
        }
        break;
      case _a.audio:
        this.handleAudioMuteChange(track);
        break;
    }
  }


  /**
   *
   * @param {*} child
   * @param {*} pn
   */
  onPartReady(child, pn) {
    switch (pn) {
      case _a.label:
        this.waitElement(child.el, () => {
          child.spinner(1);
        });
        break;
      case _a.video:
        this.toggleAvatarVideo(1, 0);
    }
  }

  /**
   *
   * @param {*} cmd
   * @param {*} args
   */
  onUiEvent(cmd) {
    let service = cmd.get(_a.service) || cmd.get(_a.name);
    switch (service) {
      case "togglefullscreen":
        this.triggerHandlers({ service, state: cmd.mget(_a.state) });
        return;
      case "pin-tile":
        // Forward to the meeting window with the participant identity so
        // it can mark the right tile as pinned. uid is the drumate id;
        // participant_id is the jitsi room handle — pass both for the
        // benefit of the dashboard refresh path.
        this.triggerHandlers({
          service: "pin-tile",
          participant_id: this.mget("participant_id"),
          uid: this.mget(_a.uid),
        });
        return;
    }
  }

  /**
   * 
   */
  hasAudioTrack() {
    for (track of this.tracks) {
      if (track && track.isActive() && track.getType() == _a.audio) {
        return track;
      }
    }
    return null;
  }
  /**
* 
*/
  getRemoteTrack(type) {
    let track = 0;
    switch (type) {
      case _a.video:
      case _a.audio:
        for (track of this.tracks) {
          if (track && track.isActive() && track.getType() == type) {
            return track;
          }
        }
        break;
      case _a.desktop:
        for (track of this.tracks) {
          if (track && track.isActive() && track.getVideoType() == type) {
            return track;
          }
        }
        break;
    }
    return null;
  }
  /**
 * 
 */
  async removeRemoteTrack(type) {
    let i = 0;
    switch (type) {
      case _a.audio:
      case _a.video:
        for (let track of this.tracks) {
          if (track && track.getType() == type) {
            if (!track.disposed) {
              await track.dispose();
            }
            this.tracks.splice(i, 1);
          }
          i++;
        }
        break;
      case _a.desktop:
        for (let track of this.tracks) {
          if (track && (track.getVideoType() == type || track.getType() == _a.video)) {
            if (!track.disposed) {
              await track.dispose();
            }
            this.tracks.splice(i, 1);
          }
          i++;
        }
        break;
    }
  }

}

module.exports = __remote_user;
