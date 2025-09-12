const JitsiMeetJS = require('vendor/lib/jitsi/lib-jitsi-meet.min.js');
class __dmz_meeting extends LetcBox {

  /**
   * 
   * @param {*} opt 
   */
  initialize(opt) {
    require('./skin');
    super.initialize(opt);
    this.declareHandlers();
    this.defaultSkeleton = require('./skeleton/index');
    this.headerSkeleton = require('./skeleton/header');
    this.infoSkeleton = require('./skeleton/information');
    this.footerSkeleton = require('dmz/skeleton/common/footer');
    this.nodeInfoService = SERVICE.media.get_node_attr;
    this.token = this.mget(_a.token) || Visitor.parseModule()[2];
    this.username = localStorage.getItem(`guestname_${this.token}`);
    this.user = {};
  }

  /**
   * 
   */
  onBeforeDestroy() {
    this.unbindEvent();
    this.unload();
  }

  /**
   * Do not remove
   */
  onChildBubble() {
  }

  /**
   *
   */
  async unload() {
    if (this.unloaded || !this.room) return;
    this.unloaded = 1;
    let opt = {
      nid: this.mget(_a.room_id),
      room_id: this.mget(_a.room_id)
    }
    return this.postService(SERVICE.conference.leave, opt, { async: 1 });

  }


  /**
   *
  */
  onDomRefresh() {
    this.feed(this.defaultSkeleton(this));
    let timer = setInterval(() => {
      let event = wsRouter.hasListener(this);
      if (event && event.length) {
        clearInterval(timer);
        return;
      }
      this.bindEvent("live");
    }, 2000)

    this.lastChange = (new Date()).getTime();
    screen.orientation.addEventListener("change", (event) => {
      let parts = [
        "device-button",
        "lobby-container",
        "message",
        _a.header,
        _a.footer,
        'action-buttons',
        'lobby-options',
      ];
      for (let pn of parts) {
        let p = this.findPart(pn);
        p && p._responsive(0);
      }
    });
  }


  route() {
    if (!this._loaded) {
      super.route()
    }
    this._loaded = 1;
  }

  onPartReady(child, pn) {
    switch (pn) {
      case 'desk-content':
        child.once('content:ready', () => {
          this.windowsLayer = child.windowsLayer;
          this.loadWindowManager();
        })
        child.once('conference.start', async (args) => {
          let { data } = args;
          if (this.hasStarted) return;
          this.checkPermission(data);
          await this.shouldStart();
        })
        return;
      case "logo-block":
        let mascott = require("assets/mascot.png").default;
        child.el.style.backgroundImage = `url(${mascott})`;
        return;
    }
  }
  /**
    * 
    * @returns 
    */
  guestName() {
    if (Visitor.isGuest()) {
      let name = localStorage.getItem(`guestname_${this.token}`);
      if (/^(nobody|anonymous)/i.test(name)) name = "";
      if (name) return name;
    }
    if (this.mget(_a.firstname)) return this.mget(_a.firstname);
    if (this.mget(_a.lastname)) return this.mget(_a.lastname);
    if (this.user && this.user.firstname) {
      this.username = this.user.firstname || this.user.username;
    }
    if (this.username) return this.username;
    return "";
  }


  /**
   * 
   * @returns 
   */
  promptParticipantName() {
    let name = this.__refUsername.getValue();
    if (_.isEmpty(name)) {
      this.__refUsername.showError();
      return;
    }
    this.username = name;
    let [firstname, lastname] = name.split(/[ \,\.]/);
    this.user.firstname = firstname;
    this.user.lastname = lastname || firstname;
    this.user.username = name;
    lastname = lastname || firstname;
    this.mset({ firstname, lastname });
    localStorage.setItem(`guestname_${this.token}`, name);
    return name;
  }

  /**
   * @param {LetcBox} cmd
   * @param {any} args
  */
  async onUiEvent(cmd, args = {}) {
    const service = args.service || cmd.mget(_a.service);
    switch (service) {
      case _e.hello:
        if (!this.promptParticipantName()) {
          this.__refUsername.showError();
          return;
        }
        await this.shouldStart();
        break;

      case 'wait-start':
        if (!this.promptParticipantName()) {
          this.__refUsername.showError();
          return;
        }
        this.windowsLayer.feed(this.infoSkeleton(this));
        break;

      case "check-devices":
        this.ensurePart('devices-testing').then((p) => {
          p.feed(require("./skeleton/devices-test")(this));
        });
        break;

      case "test-speaker":
        if (this._currentTrack) {
          await this._currentTrack.dispose();
          this._currentTrack = null;
        }
        if (!this._audio) {
          this.checkSpeaker();
        } else {
          if (this._audio.paused) {
            this._audio.play();
          } else {
            this._audio.pause();
            this.showTestResult();
          }
        }
        break;

      case "test-mic":
      case "test-video":
        if (this._audio) {
          this._audio.pause();
        }
        const type = cmd.mget(_a.type) || _a.audio;
        if (this._currentTrack) {
          const ctype = this._currentTrack.getType();
          await this._currentTrack.dispose();
          this.attachTrack();
          if (ctype == type) {
            return;
          }
        }
        this.checkDevicesPemission(type).then((tracks) => {
          if (tracks && tracks[0] && tracks[0].stream) {
            this.attachTrack(tracks[0]);
          }
        }).catch((msg) => {
          this.showTestResult(msg);
        })
        break;

      case "join-conference":
        if (this._audio) {
          this._audio.pause();
        }
        if (this._currentTrack) {
          await this._currentTrack.dispose();
          this._currentTrack = null;
        }
        await this.shouldStart();
        break;

      case "close-window":
        window.close();
        break;

      case "reload":
        location.reload();
        break;
    }
  }

  /**
 * @param {*} service
 * @param {*} data
 * @param {*} options
 */
  async onWsMessage(service, data, options) {
    this.verbose("AAA:231", options.service, data.socket_id, data, options);
    switch (options.service) {
      case 'conference.start':
        this.checkPermission(data);
        await this.shouldStart();
    }
  }

  /**
   * 
   */
  checkPermission(data) {
    let userData = this.mget('userData') || {};
    let { permission } = userData;
    if (permission && data.status == "started") {
      userData.status = data.status;
      this.mset({ userData });
    }
  }

  /**
   * 
   */
  async start() {
    if (this.hasStarted) return;
    this.hasStarted = 1;
    let width = window.innerWidth - 50;
    if (width < 500) width = window.innerWidth;
    if (width > 1000) width = 1000;
    let height = window.innerHeight;
    if (height > 900) height = 900;
    height = height - 60;
    let left = (window.innerWidth - width) / 2;
    await this.ensurePart('desk-content');
    await this.ensureElement(this.windowsLayer.el);
    let top = -1 * this.windowsLayer.$el.offset().top;
    let opt = {
      kind: "window_meeting",
      hub_id: this.get(_a.hub_id),
      room_id: this.get(_a.nid),
      nid: this.get(_a.nid),
      trigger: this,
      area: _a.dmz,
      controls: "sf",
      mode: _a.attendee,
      filename: this.mget(_a.filename),
      firstname: this.guestName(),
      lastname: this.guestName(),
      user: this.mget('userData'),
      status: _a.guest,
      style: {
        top,
        left,
        width,
        height
      }
    }
    const lobby = this.__lobbyContainer;
    lobby.clear();
    Kind.waitFor("window_meeting").then(() => {
      let c = this.windowsLayer.feed(opt);
      c.once(_e.destroy, () => {
        this.hasStarted = 0;
        lobby.feed(this.infoSkeleton(this, LOCALE.CONFERENCE_IS_OVER, "meeting-over"))
      })
    });
    this.__footer.el.hide();
  }


  /**
* 
* @returns 
*/
  async join() {
    await uiRouter.ensureWebsocket();
    let firstname = this.mget(_a.firstname) || this.guestName() || '';
    let lastname = this.mget(_a.lastname) || this.guestName() || '';
    let guest_name = this.guestName();
    let opt = {
      socket_id: Visitor.get(_a.socket_id),
      nid: this.mget(_a.nid),
      room_id: this.mget(_a.nid),
      hub_id: this.mget(_a.hub_id),
      guest_name,
      firstname,
      metadata: { firstname, lastname, guest_name },
      type: _a.meeting,
      filename: this.mget(_a.filename),
      room_type: _a.meeting,
      service: SERVICE.conference.join
    };
    try {
      let room = await this.postService(opt);
      if (!room || !room.user || !room.user.permission) {
        return null;
      }
      let { user } = room;
      user.firstname = user.firstname || firstname;
      user.lastname = user.lastname || lastname;
      user.username = user.username || guest_name;
      this.mset({
        ...room.details,
        room_id: room.user.room_id,
        uid: room.uid,
        username: user.username,
        firstname: user.firstname,
        lastname: user.lastname,
        role: room.role,
        status: room.status
      });
      this.joined = 1;
      return user;
    } catch (e) {
      this.warn("Failed to join the room", e)
      return null;
    }
  }

  /**
   *
   * @param {*} tracks
   */
  checkDevicesPemission(devices, micDeviceId = "default") {
    if (!_.isArray(devices)) devices = [devices];
    const opt = require("builtins/webrtc/room/configs/tracks")({ devices, micDeviceId });
    return new Promise((resolve, reject) => {
      JitsiMeetJS.createLocalTracks(opt)
        .then(async (tracks) => {
          this._tracksInitialized = true;
          resolve(tracks);
        })
        .catch((error) => {
          this.warn("Failed to get device permision:", error);
          let details = error.message || `${error}`;
          let msg = `${LOCALE.DEVICES_PERMISSION_DENIED} (${details})`;
          reject(msg);
        });
    });
  }

  /**
   * 
   */
  showTestResult(text) {
    this.ensurePart('devices-output').then((p) => {
      if (text) {
        p.feed(Skeletons.Note(text));
      } else {
        p.clear();
      }
    });
  }

  /**
   * 
   */
  attachTrack(track) {
    this.ensurePart('devices-output').then(async (p) => {
      if (track) {
        this._currentTrack = track;
        if (track.getType() == _a.audio) {
          p.feed({ kind: "sound_analyzer", stream: track.stream });
        } else {
          let opt = {
            tagName: _a.video,
            active: 1,
            attrOpt: {
              autoplay: "true",
              id: `${this.get(_a.widgetId)}-remote-video`,
              playsinline: "true"
            }
          }
          p.feed(Skeletons.Element(opt));
          const vid = p.children.last();
          vid.el.srcObject = track.stream;
        }
      } else {
        if (this._currentTrack) {
          await this._currentTrack.dispose();
        }
        this._currentTrack = null;
        p.clear();
      }
    });
  }


  /**
    * 
    * @param {*} url 
    * @param {*} l 
    */
  checkSpeaker() {
    const { endpoint } = bootstrap();
    let url = `${endpoint}${_K.ringtones.incoming}`;
    if (!this._audio) {
      this._audio = new Audio();
    }
    this._audio.loop = 0;
    this._audio.preload = 'none';
    this._audio.src = url;
    this._audio.onplay = () => {
      this.showTestResult(LOCALE.SOUND_IS_PLAYING);
    };
    this._audio.play().then(() => {
    }).catch((e) => {
      this.showTestResult(LOCALE.SPEAKER_NOT_WORKING);
    });
  }
  /**
   * 
   */
  async shouldStart() {
    let layer = this.windowsLayer;
    const lobby = await this.ensurePart("lobby-container");

    let guest_name = this.guestName();
    if (!guest_name) {
      lobby.feed(require('./skeleton/username').default(this));
      return;
    }
    let user = this.mget('userData');
    if (this.hasStarted && user && user.status == "started") {
      this.warn("Already started", user, this.hasStarted);
      return;
    }
    user = await this.join();
    if (!user) {
      lobby.feed(this.infoSkeleton(this, LOCALE.WEAK_PRIVILEGE, "weak-privilege"));
      return;
    }
    this.mset({ userData: user });

    if (!user || !user.status) {
      lobby.feed(this.infoSkeleton(this, LOCALE.LINK_EXPIRES));
      return;
    }

    if (user.status == 'waiting') {
      if (!user.username) {
        lobby.feed(require('./skeleton/username').default(this, 'wait-start'));
      } else {
        lobby.feed(this.infoSkeleton(this));
      }
    } else {
      if (user.permission) {
        if (!user.username) {
          lobby.feed(require('./skeleton/username').default(this));
        } else {
          await this.start()
        }
      } else {
        lobby.feed(this.infoSkeleton(this, LOCALE.WEAK_PRIVILEGE, "weak-privilege"));
      }
    }
  }

  /**
  *
  */
  async loadWindowManager() {
    await uiRouter.ensureWebsocket();
    let token = this.mget(_a.token);
    const socker_id = Visitor.get(_a.socker_id);
    const args = { token, socker_id, hub_id: "" };
    let data = await this.postService(SERVICE.dmz.login, args);
    if (data.profile) {
      if (_.isString(data.profile)) {
        data.profile = JSON.parse(data.profile)
      }
      Visitor.set({ id: data.uid });
      Visitor.set({ is_guest: data.is_guest });
      this.user = data.profile;
      let { firstname, lastname } = data.profile;
      this.mset({ firstname, lastname });
      this.username = firstname;
      if (lastname) this.username = `${firstname} ${lastname}`;
    }
    let { nid, hub_id } = data;
    this.mset({ nid, hub_id })
    if (data.error) {
      let message = await this.ensurePart('message');
      message.set({ content: data.error });
      return;
    }

    const lobby = await this.ensurePart("lobby-container");

    if (data.validity != 'TICKET_OK') {
      lobby.feed(this.infoSkeleton(this, LOCALE.LINK_EXPIRES));
      return;
    }

    lobby.anim([1, { scale: 0.9, alpha: 0.0 }]);
    setTimeout(() => {
      lobby.feed(require("./skeleton/lobby")(this, data));
      lobby.anim([1, { scale: 1, alpha: 1.0 }]);
    }, 1000);
    this.state = "before-start";
    this.sessionData = data;
  }

  /**
   * 
   */
  membersListApi() {
    return null;
  }

  /**
   * 
   * @param {*} data 
   */
  update_attendees(data) {
  }

}


module.exports = __dmz_meeting;

