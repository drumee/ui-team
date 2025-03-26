const { toggleState } = require("core/utils")
const PARTICIPANT_ID = "participant_id";
const __stream = require("builtins/webrtc/endpoint");
const { events: JEVENTS } = require('jitsi/lib-jitsi-meet.min.js');

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
    let loader = this.loaderSkeleton || require('./skeleton/loading');
    let timer = setInterval(() => {
      let tracks = this.participant.getTracks();
      if (tracks.length) {
        clearInterval(timer);
        this.onStatsReceived(this.participant);
      }
    }, 1000);

    this.feed(loader(this));
  }

  /**
   *
   */
  isMuted() {
    let p = this.participant;
    if (!p) return true;

    if (this.logicalParent.__ctrlAudio.getState() == 0) {
      return true;
    }

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
          /** Wait afew seconds to ensure video type is stable */
          if (track.getVideoType() == _a.desktop) {
            this.toggleAvatarVideo(1, 0);
          } else {
            if (track.isMuted()) {
              track.detach(v.el);
              this.toggleAvatarVideo(1, 0);
            } else {
              this.toggleAvatarVideo(0, 1);
              track.attach(v.el);
              this.trigger("audio:ready");
            }
          }
        }, 3000);
      }
    });
  }

  /**
   * 
   */
  handleAudioMuteChange(track) {
    if (!track) {
      this.debug("AAA:338 No track to handle", track);
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
        this.updateCommandPanel();
        this._audioReady = true;
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
        if (track.getVideoType() == "camera") {
          if (track.isMuted()) {
            this.toggleAvatarVideo(1, 0);
          } else {
            this.handleVideoMuteChange(track);
          }
        } else if (track.getVideoType() == _a.desktop) {
          this.toggleAvatarVideo(1, 0);
          this.handleVideoMuteChange(track);
        } else {
          WAITING_SCREEN = 0;
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
